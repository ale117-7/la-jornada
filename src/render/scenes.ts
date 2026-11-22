// Escenas de los sucesos más memorables: las 10 rarezas (EVENTOS_Y_RUTA.md §4.7), los eventos de
// capa y los peligros clave. Solo dibujan: cada escena sale de world.eventos/eventosT y dura lo que
// dura su efecto (el buff del mismo nombre) o, si el suceso es instantáneo, un tiempo propio.
import type { DayState } from '../core/types';
import { EVENT_BY_ID } from '../data/events';
import { drawFrame, frameOf, type DrawOpts, type Ref } from './art/sprites';
import { glowSprite } from './fx';
import { bolt, clamp01, hash, mod, type Actor, type Chip, type View } from './mechanics';
import { rgba, type Ambient, type ThemeVariant } from './theme';

export interface Scene {
  id: string;
  t0: number;
  end: number;
  /** ms trabajados desde que empezó. */
  k: number;
  /** ms trabajados hasta que acabe. */
  left: number;
  /** Metros de cámara cuando se vio por primera vez (para anclarla a la pared). */
  d0: number;
}

interface SceneDef {
  /** Duración visual si el suceso no deja un efecto temporal (ms). */
  dur: number;
  far?(v: View, sc: Scene): void;
  near?(v: View, sc: Scene): void;
  front?(v: View, sc: Scene, actors: Actor[]): void;
  /** Marcador en el HUD mientras dura (solo las largas). */
  chip?: string;
}

const TAU = Math.PI * 2;
const GOLD = '#ffd27a';
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** Aparece y desaparece suavemente. */
const fade = (sc: Scene, inMs: number, outMs: number) => clamp01(Math.min(sc.k / inMs, sc.left / outMs));
/** X en pantalla de algo anclado a la pared (parallax f) que apareció en la posición `x0`. */
const anchored = (v: View, sc: Scene, x0: number, f: number) => x0 - (v.dist - sc.d0) * v.ppm * f;

// Hojas de arte de las escenas (IMAGENES/…/Escenas de sucesos).
const TREN = 'el-tren-fantasma';
const BALLENA = 'la-ballena-de-niebla';
const ESPEJO = 'la-ciudad-espejo';
const TEL = 'el-telefono-de-la-pared';
const PLACAS = 'lluvia-de-placas';
const PUERTA = 'la-puerta-pintada';
const RELOJES = 'el-jardin-de-relojes';
const MIRADA = 'la-mirada';
const CANCION = 'la-cancion';
const APAGON = 'apagon';
const APAGON_SIGNS: Ref[] = [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3], [3, 1], [4, 1], [6, 1], [6, 2], [6, 3]];
const ECLIPSE = 'eclipse-de-neon';
const MAREA = 'marea-negra';
const LUNA = 'luna-interior';
const ESPORAS = 'tormenta-de-esporas';

/** Cuadro de una hoja con el pie en (x, y) y `h` px de alto. false si aún no ha cargado. */
function spr(ctx: CanvasRenderingContext2D, sheet: string, ref: Ref, x: number, y: number, h: number, o: DrawOpts = {}): boolean {
  const f = frameOf(sheet, ref);
  return !!f && h > 0 && drawFrame(ctx, sheet, ref, x, y, h / f[4], o);
}
/** Igual, centrado en (x, y). */
function sprC(ctx: CanvasRenderingContext2D, sheet: string, ref: Ref, x: number, y: number, h: number, o: DrawOpts = {}): boolean {
  return spr(ctx, sheet, ref, x, y + h / 2, h, o);
}

// ---------- las escenas ----------

const SCENES: Record<string, SceneDef> = {
  // Un tren iluminado recorre la pared del abismo; el grupo lo aborda (+10 tramos).
  tren_fantasma: {
    dur: 26_000,
    near(v, sc) {
      const { ctx, w, hgt, groundY: gy, u, t, ov } = v;
      const p = sc.k / 26_000;
      const a = fade(sc, 1200, 2500);
      const carW = u * 3.2;
      const carH = u * 1.1;
      const cars = 6;
      const ty = Math.max(carH + 4, gy - Math.min(hgt * 0.5, u * 5.5));
      // Vía tendida en la roca.
      ctx.fillStyle = rgba(GOLD, 0.2 * a);
      ctx.fillRect(0, ty + carH * 0.55, w, 1.5);
      // Entra lento, acelera al pasar junto al grupo y se va.
      const span = w + carW * cars * 2.2;
      const head = -carW * cars * 1.1 + span * (p < 0.5 ? 0.6 * ease(p * 2) : 0.6 + 0.4 * ((p - 0.5) * 2) ** 1.6);
      ctx.globalAlpha = a;
      // El tren dibujado (locomotora a la derecha, con su faro y su estela).
      const tf = frameOf(TREN, [2, 1]);
      const tk = tf ? (carW * cars * 1.25) / tf[3] : 0;
      const trainArt = !!tf && drawFrame(ctx, TREN, [2, 1], head + u * 3 - (tf[3] - tf[5]) * tk, ty + carH * 1.1, tk, { alpha: a });
      if (!trainArt) {
      // Haz del faro.
      const beam = ctx.createLinearGradient(head, 0, head + u * 9, 0);
      beam.addColorStop(0, 'rgba(255,230,170,0.35)');
      beam.addColorStop(1, 'rgba(255,230,170,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(head, ty - carH * 0.2);
      ctx.lineTo(head + u * 9, ty - carH * 1.2);
      ctx.lineTo(head + u * 9, ty + carH * 1.3);
      ctx.lineTo(head, ty + carH * 0.3);
      ctx.fill();
      for (let c = 0; c < cars; c++) {
        const x = head - carW - c * (carW + u * 0.25);
        if (x > w || x + carW < 0) continue;
        ctx.globalAlpha = a * 0.5;
        ctx.drawImage(glowSprite('#bfe8ff'), x - u, ty - carH, carW + u * 2, carH * 3);
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = 'rgba(28,36,58,0.9)';
        ctx.fillRect(x, ty - carH * 0.5, carW, carH);
        ctx.fillStyle = 'rgba(191,232,255,0.7)';
        ctx.fillRect(x, ty - carH * 0.5, carW, 1.5);
        for (let k = 0; k < 4; k++) {
          const on = hash(c * 7 + k + Math.floor(t / 400)) > 0.12;
          ctx.fillStyle = on ? 'rgba(255,214,140,0.95)' : 'rgba(255,214,140,0.3)';
          ctx.fillRect(x + u * 0.25 + k * carW * 0.24, ty - carH * 0.28, carW * 0.16, carH * 0.38);
        }
      }
      }
      // Estela de chispas fantasma.
      ctx.fillStyle = 'rgba(191,232,255,0.6)';
      const tail = head - cars * (carW + u * 0.25) - carW;
      for (let i = 0; i < 14; i++) ctx.fillRect(tail - i * u * 0.6 - hash(i) * u, ty + (hash(i + 3) - 0.5) * carH, 2, 2);
      ctx.globalAlpha = 1;
      if (!ov && p > 0.35 && p < 0.75) {
        ctx.fillStyle = rgba(GOLD, 0.9 * clamp01(Math.min((p - 0.35) * 12, (0.75 - p) * 12)));
        ctx.font = `bold ${Math.round(u * 0.6)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('EL GRUPO LO ABORDA · +10 TRAMOS', w / 2, ty - carH * (trainArt && tf ? (tf[4] * tk) / carH + 0.2 : 1.4));
        ctx.textAlign = 'left';
      }
    },
  },

  // Una ballena colosal cruza el abismo; todo se detiene un minuto a mirarla. Después, niebla.
  ballena_niebla: {
    dur: 70_000,
    chip: '≈ BALLENA DE NIEBLA · TODO ×2',
    far(v, sc) {
      const { ctx, w, hgt, groundY: gy, t } = v;
      // Bancos de niebla durante todo el efecto.
      const a = fade(sc, 4000, 6000);
      for (let k = 0; k < 3; k++) {
        const x = mod(k * w * 0.5 - t * 0.008 * (k + 1) - (v.dist - sc.d0) * v.ppm * 0.03, w * 1.6) - w * 0.4;
        ctx.globalAlpha = (v.ov ? 0.18 : 0.28) * a;
        ctx.drawImage(glowSprite('#c9d6e3'), x, gy * (0.15 + k * 0.25), w * 0.9, hgt * 0.5);
      }
      ctx.globalAlpha = 1;
    },
    near(v, sc) {
      if (sc.k > 70_000) return;
      const { ctx, w, hgt, groundY: gy, t, u } = v;
      const p = sc.k / 70_000;
      const a = clamp01(Math.min(sc.k / 5000, (70_000 - sc.k) / 6000));
      const L = Math.min(w * 0.55, Math.max(hgt * 2.6, u * 14));
      const cx = w + L * 0.6 - p * (w + L * 1.4);
      const cy = Math.min(gy * 0.42, hgt * 0.4) + Math.sin(p * TAU) * hgt * 0.05;
      const bh = L * 0.15;
      const col = `rgba(201,214,227,${0.42 * a})`;
      // La ballena dibujada (su hoja la pinta mirando a la derecha: se voltea, viaja hacia la izquierda).
      const whale = sprC(ctx, BALLENA, [3, 1], cx, cy, L * 0.3, { alpha: 0.72 * a, flip: true });
      if (!whale) {
      ctx.fillStyle = col;
      // Cuerpo, cabeza roma a la izquierda (va hacia allí) y aleta caudal que ondula.
      ctx.beginPath();
      ctx.ellipse(cx, cy, L * 0.42, bh, -0.03, 0, TAU);
      ctx.fill();
      const tx = cx + L * 0.42;
      const sw = Math.sin(t / 900) * bh * 0.6;
      ctx.beginPath();
      ctx.moveTo(tx - L * 0.05, cy - bh * 0.15);
      ctx.quadraticCurveTo(tx + L * 0.08, cy + sw * 0.5, tx + L * 0.16, cy - bh * 0.9 + sw);
      ctx.quadraticCurveTo(tx + L * 0.11, cy + sw, tx + L * 0.16, cy + bh * 0.9 + sw);
      ctx.quadraticCurveTo(tx + L * 0.08, cy + sw * 0.5, tx - L * 0.05, cy + bh * 0.15);
      ctx.fill();
      // Aleta pectoral.
      ctx.beginPath();
      ctx.moveTo(cx - L * 0.15, cy + bh * 0.5);
      ctx.quadraticCurveTo(cx - L * 0.05, cy + bh * (1.6 + 0.3 * Math.sin(t / 700)), cx + L * 0.02, cy + bh * 0.6);
      ctx.fill();
      // Surcos del vientre y ojo.
      ctx.strokeStyle = `rgba(120,140,160,${0.35 * a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        ctx.moveTo(cx - L * 0.35, cy + bh * (0.25 + k * 0.15));
        ctx.quadraticCurveTo(cx, cy + bh * (0.5 + k * 0.12), cx + L * 0.2, cy + bh * (0.3 + k * 0.1));
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(20,30,40,${0.7 * a})`;
      ctx.fillRect(cx - L * 0.33, cy - bh * 0.1, Math.max(2, u * 0.18), Math.max(2, u * 0.18));
      // Motas de luz a lo largo del lomo.
      for (let k = 0; k < 8; k++) {
        ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(t / 500 + k));
        ctx.drawImage(glowSprite('#e8f4ff'), cx - L * 0.3 + k * L * 0.08 - 5, cy - bh * 0.7 - 5, 10, 10);
      }
      }
      // Su canto: anillos que salen de la cabeza.
      const ring = (sc.k % 9000) / 9000;
      ctx.globalAlpha = a * (1 - ring) * 0.6;
      ctx.strokeStyle = '#e8f4ff';
      ctx.beginPath();
      ctx.ellipse(cx - L * 0.42, cy, L * 0.1 + ring * L * 0.5, bh * 0.6 + ring * bh * 2, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  },

  // La megaciudad, invertida, cuelga del vacío durante 10 min.
  ciudad_espejo: {
    dur: 0,
    chip: '◇ CIUDAD ESPEJO · BOTÍN ×3',
    far(v, sc) {
      const { ctx, w, hgt, groundY: gy, u, t } = v;
      const a = fade(sc, 4000, 4000);
      const cw = Math.max(18, u * 2.6);
      const o = v.dist * v.ppm * 0.06;
      const hy = Math.min(gy * 0.55, hgt * 0.5);
      // La ciudad dibujada: islas invertidas que cuelgan del vacío (la hoja trae 8).
      const pw = hy * 1.9;
      const po = v.dist * v.ppm * 0.06;
      let art = !!frameOf(ESPEJO, [4, 1]);
      for (let i = Math.floor(po / pw) - 1; art && i * pw - po < w + pw; i++) {
        const ph = hy * (0.7 + 0.3 * hash(i + 210));
        art = spr(ctx, ESPEJO, [4, 1 + mod(i, 8)], i * pw - po + pw / 2, ph, ph, { alpha: 0.55 * a });
      }
      for (let i = Math.floor(o / cw) - 1; !art && i * cw - o < w + cw; i++) {
        if (hash(i + 200) < 0.18) continue;
        const x = i * cw - o;
        const bw = cw * (0.6 + 0.3 * hash(i + 201));
        const h = hy * (0.35 + 0.6 * hash(i + 202));
        ctx.fillStyle = `rgba(190,215,230,${0.2 * a})`;
        ctx.fillRect(x, 0, bw, h);
        ctx.fillRect(x + bw * 0.45, h, 1.5, h * 0.12); // antena hacia abajo
        ctx.fillStyle = `rgba(235,248,255,${0.6 * a})`;
        for (let r = 0; r < h / 10 - 1; r++) {
          if (hash(i * 13 + r) < 0.7) continue;
          ctx.fillRect(x + 3 + (hash(i + r * 3) * (bw - 7)), h - 6 - r * 10, 3, 3);
        }
      }
      // Línea de la superficie donde la ciudad se refleja.
      ctx.fillStyle = `rgba(220,240,250,${0.25 * a * (0.7 + 0.3 * Math.sin(t / 600))})`;
      ctx.fillRect(0, hy + 2, w, 1);
    },
  },

  // Un teléfono público suena en la roca. Mensaje críptico y un Artefacto legendario.
  telefono_pared: {
    dur: 40_000,
    near(v, sc) {
      const { ctx, groundY: gy, u, t, ov } = v;
      const a = fade(sc, 800, 3000);
      const x = anchored(v, sc, v.w * 0.72, 0.3);
      if (x < -u * 4 || x > v.w + u * 4) return;
      const ringing = sc.k < 14_000;
      const shake = ringing && Math.sin(t / 40) > 0 ? Math.sin(t / 25) * u * 0.08 : 0;
      const y = gy - u * 3.4;
      ctx.globalAlpha = a;
      // La cabina dibujada: suena (tiembla), alguien contesta y se llena de luz dorada.
      const tref: Ref = ringing ? [1, 1 + (Math.floor(t / 110) % 4)] : sc.k < 17_000 ? [1, 5 + (Math.floor(t / 300) % 2)] : [2, 1 + Math.min(3, Math.floor((sc.k - 17_000) / 1200))];
      const cabin = spr(ctx, TEL, tref, x + shake, gy, u * 4.4, { alpha: a });
      if (!cabin) {
      // Cabina: capucha, cuerpo y teclado.
      ctx.fillStyle = '#2a3140';
      ctx.fillRect(x - u * 1.1, y - u * 0.4, u * 2.2, u * 0.35);
      ctx.fillStyle = '#3c4658';
      ctx.fillRect(x - u * 0.9 + shake, y, u * 1.8, u * 2.4);
      ctx.fillStyle = 'rgba(255,214,140,0.5)';
      ctx.fillRect(x - u * 0.9, y - u * 0.05, u * 1.8, 2);
      ctx.fillStyle = '#9aa6b8';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x - u * 0.2 + c * u * 0.22 + shake, y + u * 0.9 + r * u * 0.22, u * 0.12, u * 0.12);
      }
      ctx.strokeStyle = '#11151c';
      ctx.lineWidth = Math.max(1, u * 0.08);
      if (ringing) {
        // Auricular colgado y anillos de timbre.
        ctx.fillStyle = '#11151c';
        if (!cabin) ctx.fillRect(x - u * 0.75 + shake, y + u * 0.2, u * 0.3, u * 1.2);
        ctx.strokeStyle = rgba(GOLD, 0.8);
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 2; k++) {
          const r = ((t / 500 + k * 0.5) % 1) * u * 2.2;
          ctx.globalAlpha = a * (1 - r / (u * 2.2));
          ctx.beginPath();
          ctx.arc(x, y + u * 0.9, u * 1.2 + r, -1.1, -0.2);
          ctx.arc(x, y + u * 0.9, u * 1.2 + r, Math.PI + 0.2, Math.PI + 1.1);
          ctx.stroke();
        }
        ctx.globalAlpha = a;
        if (!ov) {
          ctx.fillStyle = GOLD;
          ctx.font = `bold ${Math.round(u * 0.55)}px monospace`;
          ctx.fillText('RIIIN', x + u * 1.3, y - u * 0.3);
        }
      } else {
        // Alguien contestó: el auricular cuelga del cable y sube una luz dorada.
        const sw = Math.sin(t / 600) * u * 0.4;
        if (!cabin) {
          ctx.beginPath();
          ctx.moveTo(x - u * 0.6, y + u * 0.6);
          ctx.quadraticCurveTo(x - u * 0.8, y + u * 2.5, x - u * 0.6 + sw, y + u * 3.1);
          ctx.stroke();
          ctx.fillStyle = '#11151c';
          ctx.fillRect(x - u * 0.75 + sw, y + u * 3.1, u * 0.3, u * 0.7);
        }
        const up = clamp01((sc.k - 14_000) / 7000);
        if (up < 1) {
          const gy2 = y - up * u * 4;
          ctx.globalAlpha = a * (1 - up * 0.6);
          ctx.drawImage(glowSprite(GOLD), x - u * 1.5, gy2 - u * 1.5, u * 3, u * 3);
          ctx.fillStyle = '#fff6dc';
          ctx.fillRect(x - u * 0.15, gy2 - u * 0.15, u * 0.3, u * 0.3);
        }
        if (!ov && sc.k < 24_000) {
          ctx.globalAlpha = a * clamp01((24_000 - sc.k) / 2000);
          ctx.fillStyle = '#e8dcc0';
          ctx.font = `italic ${Math.round(u * 0.55)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('«Sigue bajando».', x, y - u * 1.1);
          ctx.textAlign = 'left';
        }
      }
      ctx.globalAlpha = 1;
    },
  },

  // Tu héroe de ayer corre contigo durante 30 min (lo dibuja el renderer: es un actor).
  descensor_ayer: { dur: 0, chip: '☍ EL DESCENSOR DE AYER' },

  // Caen placas de Descensores olvidados; se leen sus nombres.
  lluvia_placas: {
    dur: 32_000,
    front(v, sc) {
      const { ctx, w, groundY: gy, u, ov } = v;
      const n = ov ? 12 : 22;
      const pw = Math.max(5, u * 0.55);
      const ph = Math.max(3, u * 0.32);
      const namedX: number[] = [];
      for (let i = 0; i < n; i++) {
        const delay = hash(i + sc.t0) * 14_000;
        const fall = 3200 + hash(i + 1 + sc.t0) * 2600;
        const k = sc.k - delay;
        if (k < 0) continue;
        const x = w * (0.06 + 0.88 * hash(i + 2 + sc.t0));
        const land = gy - ph * 0.5;
        let y: number;
        let rot: number;
        let a = 1;
        if (k < fall) {
          const f = k / fall;
          y = -10 + (land + 10) * f * f;
          rot = f * 9 * (hash(i + 4) - 0.5) * 2;
        } else {
          y = land;
          rot = (hash(i + 5) - 0.5) * 0.5;
          a = clamp01((fall + 12_000 - k) / 3000);
        }
        if (a <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(x, y);
        ctx.rotate(rot);
        // Placa dibujada en uno de sus 3 metales (o la de formas mientras carga).
        if (!sprC(ctx, PLACAS, [1, 1 + (i % 3)], 0, 0, ph * 1.9)) {
          ctx.fillStyle = i % 3 === 0 ? '#c9d3dc' : '#c8b06a';
          ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(-pw / 2, -ph / 2, pw, 1);
          ctx.fillStyle = 'rgba(40,30,10,0.5)';
          ctx.fillRect(-pw * 0.3, -1, pw * 0.6, 1);
        }
        ctx.restore();
        // Se leen algunos nombres, sin que se pisen entre sí.
        if (k >= fall && !ov && namedX.length < 4 && k < fall + 9000 && namedX.every((nx) => Math.abs(nx - x) > u * 6)) {
          namedX.push(x);
          ctx.globalAlpha = a * clamp01((k - fall) / 600);
          ctx.fillStyle = '#e8dcc0';
          ctx.font = `${Math.round(u * 0.45)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(plateName(sc.t0 + i), x, land - u * 0.6);
          ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 1;
      }
    },
  },

  // Una puerta dibujada en la roca se abre: mini-capa secreta con paleta propia.
  puerta_pintada: {
    dur: 0,
    chip: '▯ LA PUERTA PINTADA · OTRA LUZ',
    near(v, sc) {
      const { ctx, groundY: gy, u, t } = v;
      const x = anchored(v, sc, v.w * 0.66, 0.3);
      if (x < -u * 6 || x > v.w + u * 6) return;
      const dw = u * 2.2;
      const dh = u * 4.2;
      const draw = clamp01(sc.k / 3500);
      const open = clamp01((sc.k - 3500) / 3500);
      const a = clamp01(sc.left / 3000);
      ctx.globalAlpha = a;
      // La puerta dibujada: se traza, se abre y deja ver la otra luz.
      const pref: Ref = sc.k < 3500 ? [1, 1 + Math.min(3, Math.floor(draw * 4))] : sc.k < 7000 ? [2, 1 + Math.min(3, Math.floor(open * 4))] : [3, 1 + (Math.floor(t / 260) % 4)];
      if (open > 0) {
        ctx.globalAlpha = a * open * 0.8;
        ctx.drawImage(glowSprite('#ffd36b'), x - dw * 1.6, gy - dh * 1.3, dw * 3.2, dh * 1.6);
      }
      if (spr(ctx, PUERTA, pref, x, gy, dh * 1.15, { alpha: a })) {
        ctx.globalAlpha = 1;
        return;
      }
      ctx.globalAlpha = a;
      if (open > 0) {
        // Luz del otro lado que se derrama sobre la cornisa.
        ctx.globalAlpha = a * open * 0.8;
        ctx.drawImage(glowSprite('#ffd36b'), x - dw * 1.6, gy - dh * 1.3, dw * 3.2, dh * 1.6);
        ctx.fillStyle = `rgba(255,228,160,${0.5 * open * a})`;
        ctx.fillRect(x - dw / 2, gy - dh, dw, dh);
        ctx.fillStyle = `rgba(255,228,160,${0.25 * open * a})`;
        ctx.beginPath();
        ctx.moveTo(x - dw / 2, gy);
        ctx.lineTo(x + dw / 2, gy);
        ctx.lineTo(x + dw * 2.4, gy + u * 1.2);
        ctx.lineTo(x - dw * 2.4, gy + u * 1.2);
        ctx.fill();
        // La hoja, girando sobre sus bisagras.
        ctx.globalAlpha = a;
        ctx.fillStyle = '#5c3780';
        ctx.fillRect(x - dw / 2, gy - dh, dw * (1 - open * 0.85), dh);
      }
      // El trazo de tiza que la dibuja (dos pasadas temblorosas).
      ctx.strokeStyle = 'rgba(255,246,230,0.9)';
      ctx.lineWidth = Math.max(1.5, u * 0.12);
      const perim = dw * 2 + dh * 2;
      ctx.setLineDash([perim * draw, perim]);
      for (let k = 0; k < 2; k++) {
        const j = k * 1.5 + Math.sin(t / 200 + k) * 0.6;
        ctx.beginPath();
        ctx.moveTo(x - dw / 2 + j, gy);
        ctx.lineTo(x - dw / 2 + j, gy - dh * 0.8);
        ctx.quadraticCurveTo(x - dw / 2, gy - dh * 1.05, x + j, gy - dh - j);
        ctx.quadraticCurveTo(x + dw / 2, gy - dh * 1.05, x + dw / 2 - j, gy - dh * 0.8);
        ctx.lineTo(x + dw / 2 - j, gy);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd36b';
      ctx.fillRect(x + dw * 0.25, gy - dh * 0.45, u * 0.2, u * 0.2);
      ctx.globalAlpha = 1;
    },
  },

  // Un jardín de relojes: todo va despacio (el renderer frena las animaciones) y rinde el doble.
  jardin_relojes: {
    dur: 0,
    chip: '◷ JARDÍN DE RELOJES · PRODUCCIÓN ×2',
    far(v, sc) {
      const { ctx, w, hgt, groundY: gy, u, t, ov } = v;
      const a = fade(sc, 3000, 3000);
      const cw = u * 9;
      const o = v.dist * v.ppm * 0.08;
      ctx.lineWidth = 1;
      for (let i = Math.floor(o / cw) - 1; i * cw - o < w + cw; i++) {
        if (hash(i + 300) < 0.35) continue;
        const x = i * cw - o + cw * 0.5;
        const r = Math.min(hgt * 0.16, u * (0.9 + 1.4 * hash(i + 301)));
        const y = Math.max(r + 2, (gy - r * 2) * (0.2 + 0.6 * hash(i + 302)));
        // Relojes dibujados: de pared o de bolsillo, cada uno con su balanceo.
        const cref: Ref = hash(i + 305) > 0.5 ? [1, 1 + Math.floor(hash(i + 306) * 4)] : [2, 1 + Math.floor(hash(i + 307) * 5)];
        if (sprC(ctx, RELOJES, cref, x, y, r * 2.4, { alpha: 0.6 * a, rot: Math.sin(t / 1600 + i) * 0.08 })) continue;
        ctx.strokeStyle = `rgba(232,217,168,${0.25 * a})`;
        if (hash(i + 303) > 0.5) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, y - r);
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(30,24,14,${0.4 * a})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(232,217,168,${0.55 * a})`;
        ctx.stroke();
        if (!ov) {
          for (let k = 0; k < 12; k += 3) {
            const ang = (k / 12) * TAU;
            ctx.fillStyle = `rgba(232,217,168,${0.5 * a})`;
            ctx.fillRect(x + Math.cos(ang) * r * 0.8 - 1, y + Math.sin(ang) * r * 0.8 - 1, 2, 2);
          }
        }
        // Agujas: cada reloj a su ritmo (unos al revés).
        const sp = (hash(i + 304) - 0.3) * 0.004;
        ctx.strokeStyle = `rgba(255,236,190,${0.75 * a})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(t * sp) * r * 0.8, y + Math.sin(t * sp) * r * 0.8);
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(t * sp / 12 + i) * r * 0.5, y + Math.sin(t * sp / 12 + i) * r * 0.5);
        ctx.stroke();
      }
      // Un péndulo enorme marca el compás.
      if (spr(ctx, RELOJES, [3, 1 + (Math.floor(t / 350) % 8)], w * 0.5, gy * 0.9, gy * 0.85, { alpha: 0.4 * a })) return;
      const px = w * 0.5 + Math.sin(t / 1400) * w * 0.12;
      ctx.strokeStyle = `rgba(232,217,168,${0.2 * a})`;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(px, gy * 0.7);
      ctx.stroke();
      ctx.fillStyle = `rgba(232,217,168,${0.3 * a})`;
      ctx.beginPath();
      ctx.arc(px, gy * 0.7, Math.min(u * 0.9, hgt * 0.08), 0, TAU);
      ctx.fill();
    },
    front(v, sc) {
      v.ctx.fillStyle = `rgba(232,217,168,${0.06 * fade(sc, 3000, 3000)})`;
      v.ctx.fillRect(0, 0, v.w, v.hgt);
    },
  },

  // Un ojo gigante se abre en la pared y te observa. Después, de vez en cuando, vuelve a mirar.
  la_mirada: {
    dur: Infinity,
    far(v, sc) {
      const { ctx, w, hgt, groundY: gy, u, t, heroSX } = v;
      let cx: number;
      let cy: number;
      let ew: number;
      let open: number;
      if (sc.k < 45_000) {
        cx = anchored(v, sc, w * 0.62, 0.05);
        cy = Math.min(gy * 0.45, hgt * 0.42);
        ew = Math.min(w * 0.34, Math.max(hgt * 2.2, u * 10));
        const k = sc.k;
        open = k < 3000 ? ease(k / 3000) : k > 41_000 ? 1 - ease((k - 41_000) / 4000) : k > 24_000 && k < 24_600 ? Math.abs(Math.cos(((k - 24_000) / 600) * Math.PI)) : 1;
      } else {
        // El resto del día: cada 4 min, un ojo pequeño se abre un momento en algún sitio.
        const win = Math.floor(sc.k / 240_000);
        const lk = sc.k % 240_000;
        if (lk > 3500) return;
        cx = w * (0.25 + 0.6 * hash(win + 400));
        cy = gy * (0.2 + 0.4 * hash(win + 401));
        ew = u * 2.4;
        open = Math.sin((lk / 3500) * Math.PI);
      }
      const eh = ew * 0.42 * open;
      ctx.globalAlpha = 0.3 * open;
      ctx.drawImage(glowSprite('#ff4d5e'), cx - ew * 0.8, cy - ew * 0.5, ew * 1.6, ew);
      ctx.globalAlpha = 1;
      // El ojo dibujado: se abre por fases; abierto, alterna miradas (la hoja trae el iris en varias posiciones).
      if (open > 0.05) {
        const mref: Ref = open < 0.3 ? [1, 1] : open < 0.6 ? [1, 2] : open < 0.92 ? [1, 3] : heroSX < cx - w * 0.1 ? [2, 1 + (Math.floor(t / 2200) % 3)] : [1, 4];
        if (sprC(ctx, MIRADA, mref, cx, cy, ew * 0.62, { alpha: 0.9 })) return;
      }
      if (eh < 0.8) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - ew / 2, cy);
      ctx.quadraticCurveTo(cx, cy - eh, cx + ew / 2, cy);
      ctx.quadraticCurveTo(cx, cy + eh, cx - ew / 2, cy);
      ctx.closePath();
      ctx.fillStyle = 'rgba(214,204,186,0.6)';
      ctx.fill();
      ctx.clip();
      // El iris sigue al Descensor.
      const ir = ew * 0.17;
      const look = Math.max(-1, Math.min(1, (heroSX - cx) / (w * 0.5)));
      const ix = cx + look * ew * 0.22 + Math.sin(t / 1700) * ew * 0.02;
      const iy = cy + ew * 0.03;
      ctx.fillStyle = '#b8742a';
      ctx.beginPath();
      ctx.arc(ix, iy, ir, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#6b3a12';
      ctx.beginPath();
      ctx.arc(ix, iy, ir * 0.72, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#05060c';
      ctx.beginPath();
      ctx.ellipse(ix, iy, ir * 0.2, ir * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(ix - ir * 0.45, iy - ir * 0.5, ir * 0.22, ir * 0.22);
      ctx.restore();
      ctx.strokeStyle = 'rgba(40,20,20,0.85)';
      ctx.lineWidth = Math.max(1.5, ew * 0.012);
      ctx.beginPath();
      ctx.moveTo(cx - ew / 2, cy);
      ctx.quadraticCurveTo(cx, cy - eh, cx + ew / 2, cy);
      ctx.quadraticCurveTo(cx, cy + eh, cx - ew / 2, cy);
      ctx.stroke();
    },
  },

  // Las criaturas dejan de pelear y cantan; después, un halo dorado (el renderer) durante el buff.
  la_cancion: {
    dur: 120_000,
    chip: '♪ LA CANCIÓN',
    front(v, sc, actors) {
      if (sc.k > 120_000) return;
      const { ctx, w, groundY: gy, u, t } = v;
      const a = clamp01(Math.min(sc.k / 2000, (120_000 - sc.k) / 3000));
      // Ondas de la melodía cruzando la escena.
      ctx.strokeStyle = `rgba(255,210,140,${0.18 * a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 2; k++) {
        const y0 = gy * (0.35 + k * 0.2);
        for (let x = 0; x <= w; x += 14) {
          const y = y0 + Math.sin(x * 0.015 + t / 500 + k * 2) * u * 0.6;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      const cols = [GOLD, '#ff8ad8', '#7ef0ff'];
      ctx.font = `${Math.round(Math.max(9, u * 0.8))}px serif`;
      ctx.textAlign = 'center';
      actors.forEach((ac, i) => {
        for (let j = 0; j < 2; j++) {
          const ph = (t / 1800 + i * 0.37 + j * 0.5) % 1;
          ctx.globalAlpha = a * (1 - ph);
          ctx.fillStyle = cols[(i + j) % 3];
          const nx = ac.x + Math.sin(ph * 6 + j * 2) * u * 0.6;
          const ny = ac.y - ac.r - ph * u * 3;
          if (!spr(ctx, CANCION, [1, 1 + ((i + j) % 3)], nx, ny, u * 0.9)) ctx.fillText(j ? '♫' : '♪', nx, ny);
        }
      });
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    },
  },

  // ---------- eventos de capa y peligros ----------

  // Oscuridad total: solo se ven ojos y neón.
  apagon: {
    dur: 0,
    chip: '● APAGÓN',
    front(v, sc, actors) {
      const { ctx, w, hgt, groundY: gy, u, t, ov, heroSX, theme } = v;
      // Parpadeo al cortarse la luz y al volver.
      const flick = sc.k < 2500 ? (hash(Math.floor(t / 90)) > 0.45 ? 1 : 0) : sc.left < 1800 ? (hash(Math.floor(t / 110)) > 0.5 ? 0 : 1) : 1;
      if (!flick) return;
      ctx.fillStyle = `rgba(2,3,6,${ov ? 0.72 : 0.86})`;
      ctx.fillRect(0, 0, w, hgt);
      // Neón: el borde de la pasarela y carteles sueltos que siguen encendidos.
      ctx.fillStyle = rgba(theme.accent, 0.25);
      ctx.fillRect(0, gy - 2, w, 6);
      ctx.fillStyle = rgba(theme.accent, 0.9);
      ctx.fillRect(0, gy, w, 1.5);
      const cw = u * 11;
      const o = v.dist * v.ppm * 0.2;
      ctx.lineWidth = 1.5;
      for (let i = Math.floor(o / cw) - 1; i * cw - o < w + cw; i++) {
        if (hash(i + 500) < 0.4) continue;
        const x = i * cw - o;
        const y = gy * (0.2 + 0.5 * hash(i + 501));
        const on = hash(i + Math.floor(t / 700)) > 0.08;
        const col = hash(i + 502) > 0.5 ? theme.accent : theme.accent2;
        // Carteles de neón dibujados que siguen encendidos (o su marco mientras carga).
        const nref = APAGON_SIGNS[Math.floor(hash(i + 503) * APAGON_SIGNS.length)];
        if (!spr(ctx, APAGON, nref, x + u * 1.3, y + u * 1.4, u * 1.6, { alpha: on ? 1 : 0.3 })) {
          ctx.strokeStyle = rgba(col, on ? 0.85 : 0.25);
          ctx.strokeRect(x, y, u * 2.6, u * 0.9);
        }
        if (on) {
          ctx.globalAlpha = 0.35;
          ctx.drawImage(glowSprite(col), x - u, y - u, u * 4.6, u * 2.9);
          ctx.globalAlpha = 1;
        }
      }
      // Ojos: dos puntos por criatura, que parpadean de vez en cuando.
      actors.forEach((ac, i) => {
        if (hash(i * 7 + Math.floor(t / 2300)) > 0.86 && t % 2300 < 160) return;
        const ex = ac.x - ac.r * 0.35;
        const ey = ac.y - ac.r * 0.15;
        const s = Math.max(2, ac.r * 0.18);
        ctx.globalAlpha = 0.7;
        ctx.drawImage(glowSprite(ac.big ? '#ff4d5e' : ac.color), ex - s * 4, ey - s * 3, s * 9, s * 6);
        ctx.globalAlpha = 1;
        ctx.fillStyle = ac.big ? '#ffd0d0' : '#ffffff';
        ctx.fillRect(ex - s, ey - s / 2, s, s);
        ctx.fillRect(ex + s * 0.8, ey - s / 2, s, s);
      });
      // El visor del Descensor.
      ctx.globalAlpha = 0.6;
      ctx.drawImage(glowSprite('#3fe0e6'), heroSX - u, gy - u * 2.6, u * 2, u * 1.6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#9ff6f9';
      ctx.fillRect(heroSX, gy - u * 1.83, u * 0.26, u * 0.1);
    },
  },

  // Los hologramas cobran vida: un eclipse con corona de neón; las criaturas son hologramas.
  eclipse_neon: {
    dur: 0,
    chip: '◐ ECLIPSE DE NEÓN · BOTÍN ×2',
    far(v, sc) {
      const { ctx, w, hgt, groundY: gy, u, t } = v;
      const a = fade(sc, 4000, 4000);
      ctx.fillStyle = `rgba(10,0,20,${0.3 * a})`;
      ctx.fillRect(0, 0, w, gy);
      const cx = anchored(v, sc, w * 0.78, 0.02);
      const cy = Math.min(gy * 0.35, hgt * 0.3);
      const r = Math.min(hgt * 0.2, u * 3.5);
      ctx.globalAlpha = 0.65 * a;
      ctx.drawImage(glowSprite('#ff3fa4'), cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
      ctx.globalAlpha = 0.45 * a;
      ctx.drawImage(glowSprite('#3fe0e6'), cx - r * 1.8, cy - r * 1.8, r * 3.6, r * 3.6);
      ctx.globalAlpha = 1;
      // El eclipse dibujado, con su corona de neón.
      if (sprC(ctx, ECLIPSE, [1, 1], cx, cy, r * 3.1, { alpha: a, rot: Math.sin(t / 9000) * 0.05 })) return;
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(255,63,164,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 14; k++) {
        const ang = (k / 14) * TAU + t / 9000;
        const l = r * (1.25 + 0.35 * hash(k + Math.floor(t / 500)));
        ctx.moveTo(cx + Math.cos(ang) * r * 1.05, cy + Math.sin(ang) * r * 1.05);
        ctx.lineTo(cx + Math.cos(ang) * l, cy + Math.sin(ang) * l);
      }
      ctx.stroke();
      ctx.fillStyle = '#020205';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ff7ac2';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    near(v, sc) {
      // Anuncios holográficos que parpadean en las torres.
      const { ctx, w, groundY: gy, u, t, ov } = v;
      const a = fade(sc, 3000, 3000);
      const cw = u * 12;
      const o = v.dist * v.ppm * 0.25;
      for (let i = Math.floor(o / cw) - 1; i * cw - o < w + cw; i++) {
        if (hash(i + 600) < 0.45) continue;
        const x = i * cw - o;
        const y = gy * (0.25 + 0.4 * hash(i + 601));
        const fl = hash(i + Math.floor(t / 130)) > 0.15 ? 1 : 0.2;
        const col = hash(i + 602) > 0.5 ? '#ff3fa4' : '#3fe0e6';
        const bw = u * 3;
        const bh = u * 1.6;
        // Vallas holográficas dibujadas.
        const bref: Ref = [[1, 2], [1, 3], [2, 1], [2, 2]][Math.floor(hash(i + 604) * 4)] as Ref;
        if (spr(ctx, ECLIPSE, bref, x + bw / 2, y + bh * 1.4, bh * 1.6, { alpha: 0.75 * a * fl })) continue;
        ctx.fillStyle = rgba(col, 0.12 * a * fl);
        ctx.fillRect(x, y, bw, bh);
        ctx.fillStyle = rgba(col, 0.4 * a * fl);
        for (let k = 0; k < bh; k += 3) ctx.fillRect(x, y + k, bw, 1);
        if (!ov) {
          ctx.fillStyle = rgba(col, 0.8 * a * fl);
          ctx.font = `bold ${Math.round(u * 0.6)}px monospace`;
          ctx.fillText(['VIVE', '∞', '◈ 24H', 'BAJA'][Math.floor(hash(i + 603) * 4)], x + u * 0.3, y + bh * 0.65);
        }
      }
    },
  },

  // El vacío sube por la pared: hay que correr.
  marea_negra: {
    dur: 0,
    chip: '▲ MAREA NEGRA · ¡CORRE!',
    front(v, sc) {
      const { ctx, w, hgt, groundY: gy, u, t, heroSX } = v;
      const a = fade(sc, 3000, 4000);
      // Muro de vacío a la izquierda, con zarcillos que buscan al Descensor.
      const edge = Math.max(u * 3, heroSX * 0.55) + Math.sin(t / 1300) * u * 0.8;
      const g = ctx.createLinearGradient(0, 0, edge + u * 2, 0);
      g.addColorStop(0, `rgba(0,0,0,${0.95 * a})`);
      g.addColorStop(0.75, `rgba(0,0,0,${0.75 * a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      const pts: number[] = [];
      for (let y = 0; y <= hgt + 1; y += hgt / 10) pts.push(edge + Math.sin(y * 0.07 + t / 380) * u * 0.7 + hash(Math.floor(y) + Math.floor(t / 200)) * u * 0.4, y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let k = 0; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
      ctx.lineTo(0, hgt);
      ctx.fill();
      // El borde del vacío está vivo: un filo violeta que tiembla.
      ctx.strokeStyle = `rgba(150,70,200,${(0.45 + 0.25 * Math.sin(t / 300)) * a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pts[0] + u * 0.4, pts[1]);
      for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k] + u * 0.4, pts[k + 1]);
      ctx.stroke();
      ctx.strokeStyle = `rgba(0,0,0,${0.85 * a})`;
      ctx.lineCap = 'round';
      // Zarcillos dibujados que se estiran hacia el Descensor.
      let tendrils = true;
      for (let k = 0; k < 3 && tendrils; k++) {
        const reach = (0.5 + 0.5 * Math.sin(t / (500 + k * 170) + k * 2)) * u * 1.8;
        tendrils = spr(ctx, MAREA, [1, 1 + ((k + Math.floor(t / 450)) % 5)], edge + reach + k * u * 0.5, gy + u * 0.3, u * (2.4 + k * 0.6), { alpha: 0.9 * a, rot: 0.25 - k * 0.12 });
      }
      for (let k = 0; k < 3 && !tendrils; k++) {
        const reach = (0.5 + 0.5 * Math.sin(t / (500 + k * 170) + k * 2)) * u * 3.5;
        const y0 = gy - u * (0.4 + k * 0.9);
        ctx.lineWidth = Math.max(2, u * (0.35 - k * 0.08));
        ctx.beginPath();
        ctx.moveTo(edge, y0);
        ctx.quadraticCurveTo(edge + reach * 0.5, y0 - u * (0.8 - k * 0.5), edge + reach, y0 + Math.sin(t / 300 + k) * u * 0.3);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // El vacío también sube desde abajo.
      const rise = (0.12 + 0.04 * Math.sin(t / 900)) * hgt;
      const gb = ctx.createLinearGradient(0, hgt, 0, hgt - rise);
      gb.addColorStop(0, `rgba(0,0,0,${0.9 * a})`);
      gb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gb;
      ctx.fillRect(0, hgt - rise, w, rise);
      // Olas del vacío dibujadas a lo largo del borde de abajo.
      const ww = rise * 3.2;
      for (let i = 0; ww > 4 && i * ww < w + ww; i++) {
        spr(ctx, MAREA, [2, 1 + ((i + Math.floor(t / 600)) % 4)], i * ww + ((t * 0.05) % ww) - ww / 2, hgt + rise * 0.15, rise * 1.3, { alpha: 0.75 * a });
      }
      // Líneas de velocidad: el grupo corre.
      ctx.fillStyle = `rgba(230,240,255,${0.18 * a})`;
      for (let i = 0; i < 9; i++) {
        const x = mod(w - ((t * 0.9 + i * 211) % (w + 80)), w + 80) - 40;
        ctx.fillRect(x, gy * (0.2 + 0.7 * hash(i + 700)), u * (2 + 2 * hash(i + 701)), 1);
      }
      ctx.fillStyle = `rgba(255,77,94,${(0.2 + 0.2 * Math.sin(t / 250)) * a})`;
      ctx.fillRect(edge + u * 0.2, 0, 1.5, hgt);
    },
  },

  // Algo brilla en el fondo: una luna vista desde arriba.
  luna_interior: {
    dur: 0,
    chip: '◯ LUNA INTERIOR · +BOTÍN DOBLE',
    far(v, sc) {
      const { ctx, w, hgt, groundY: gy, t } = v;
      const a = fade(sc, 5000, 5000);
      const r = Math.min(hgt * 0.45, w * 0.17);
      const cx = anchored(v, sc, w * 0.6, 0.02);
      // Asoma por encima de la banda cercana del escenario.
      const cy = Math.min(gy + r * 0.3, gy * 0.5);
      // Haces que suben desde la luna.
      const g = ctx.createLinearGradient(0, cy, 0, 0);
      g.addColorStop(0, `rgba(238,243,255,${0.12 * a})`);
      g.addColorStop(1, 'rgba(238,243,255,0)');
      ctx.fillStyle = g;
      for (let k = 0; k < 5; k++) {
        const bx = cx + (k - 2) * r * 0.45;
        const sw = r * (0.08 + 0.05 * Math.sin(t / 1800 + k));
        ctx.beginPath();
        ctx.moveTo(bx - sw, cy - r * 0.6);
        ctx.lineTo(bx + sw, cy - r * 0.6);
        ctx.lineTo(bx + sw * 3 + (k - 2) * r * 0.3, 0);
        ctx.lineTo(bx - sw * 3 + (k - 2) * r * 0.3, 0);
        ctx.fill();
      }
      ctx.globalAlpha = 0.6 * a;
      ctx.drawImage(glowSprite('#eef3ff'), cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
      ctx.globalAlpha = 1;
      // La luna dibujada, girando muy despacio.
      if (sprC(ctx, LUNA, [1, 2], cx, cy, r * 2.5, { alpha: 0.92 * a, rot: t / 60_000 })) return;
      ctx.globalAlpha = 0.92 * a;
      const dg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      dg.addColorStop(0, '#fbf8ee');
      dg.addColorStop(1, '#c6cfdb');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,160,180,0.35)';
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.arc(cx + (hash(k + 800) - 0.5) * r * 1.2, cy + (hash(k + 801) - 0.5) * r * 1.2, r * (0.06 + 0.12 * hash(k + 802)), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    front(v, sc) {
      // Luz de luna en el borde de la cornisa.
      v.ctx.fillStyle = `rgba(238,243,255,${0.55 * fade(sc, 5000, 5000)})`;
      v.ctx.fillRect(0, v.groundY, v.w, 1.5);
    },
  },

  // Tormenta de esporas: el aire pesa y brilla.
  tormenta_esporas: {
    dur: 0,
    chip: '✺ TORMENTA DE ESPORAS · +PRESIÓN',
    front(v, sc) {
      const { ctx, w, hgt, u, t, ov } = v;
      const a = fade(sc, 3000, 3000);
      ctx.fillStyle = `rgba(110,190,110,${0.08 * a})`;
      ctx.fillRect(0, 0, w, hgt);
      const n = ov ? 40 : 90;
      for (let i = 0; i < n; i++) {
        const sp = 0.1 + 0.12 * hash(i + 900);
        const x = mod(i * 97.3 + t * sp, w + 40) - 20;
        const y = mod(i * 53.1 + t * sp * 0.45 + Math.sin(t / 700 + i) * 18, hgt);
        const s = 1.2 + 1.8 * hash(i + 901);
        ctx.fillStyle = i % 3 ? `rgba(190,255,150,${0.6 * a})` : `rgba(216,194,122,${0.7 * a})`;
        ctx.fillRect(x, y, s, s);
        if (i % 6 === 0) {
          ctx.globalAlpha = 0.5 * a;
          ctx.drawImage(glowSprite('#bfff96'), x - 6, y - 6, 12, 12);
          ctx.globalAlpha = 1;
          // Esporas grandes dibujadas (3 tamaños).
          if (i % 12 === 0) sprC(ctx, ESPORAS, [1, 1 + ((i / 12) % 3)], x, y, u * (0.5 + 0.35 * ((i / 12) % 3)), { alpha: 0.8 * a, rot: t / 1500 + i });
        }
      }
      // Ráfagas de viento (dibujadas: remolinos de esporas).
      ctx.fillStyle = `rgba(220,255,210,${0.14 * a})`;
      for (let i = 0; i < 6; i++) {
        const x = mod(i * 271 + t * 0.6, w + 120) - 60;
        const gyy = hgt * (0.15 + 0.7 * hash(i + 902));
        if (!(i % 2 === 0 && sprC(ctx, ESPORAS, [2, 1 + ((i / 2 + Math.floor(t / 500)) % 4)], x, gyy, u * 1.6, { alpha: 0.45 * a }))) ctx.fillRect(x, gyy, u * 3, 1);
      }
    },
  },
};

/** Nombres de los buffs que ya tienen escena propia (no llevan además el tinte genérico). */
export const SCENE_BUFF_NAMES = new Set(Object.keys(SCENES).map((id) => EVENT_BY_ID[id].nombre));

/** Escenas activas ahora mismo. `anchors` guarda la posición de cámara de cada una al empezar. */
export function activeScenes(s: DayState, worked: number, anchors: Map<string, number>, dist: number): Scene[] {
  const w = s.world;
  const out: Scene[] = [];
  const seen = new Set<string>();
  for (let i = w.eventos.length - 1; i >= 0; i--) {
    const id = w.eventos[i];
    const def = SCENES[id];
    if (!def || seen.has(id)) continue;
    seen.add(id);
    const t0 = w.eventosT[i];
    const nombre = EVENT_BY_ID[id].nombre;
    let end = t0 + def.dur;
    for (const b of w.buffs) if (b.nombre === nombre) end = Math.max(end, b.untilMs);
    if (worked < t0 || worked >= end) continue;
    const key = `${id}@${t0}`;
    let d0 = anchors.get(key);
    if (d0 === undefined) {
      if (anchors.size > 40) anchors.clear();
      anchors.set(key, dist);
      d0 = dist;
    }
    out.push({ id, t0, end, k: worked - t0, left: end - worked, d0 });
  }
  return out;
}

/** Lo que las escenas cambian en el resto del dibujo. */
export interface SceneMods {
  look: 'holo' | 'plata' | null;
  /** Canción: las criaturas se mecen. */
  sway: boolean;
  /** Velocidad de las animaciones (Jardín de Relojes). */
  rate: number;
  theme: ThemeVariant | null;
  ambient: Ambient | null;
  ghost: boolean;
  halo: boolean;
}

export function sceneMods(sc: Scene[]): SceneMods {
  const r: SceneMods = { look: null, sway: false, rate: 1, theme: null, ambient: null, ghost: false, halo: false };
  for (const x of sc) {
    switch (x.id) {
      case 'eclipse_neon':
        r.look = 'holo';
        break;
      case 'ciudad_espejo':
        r.look ??= 'plata';
        break;
      case 'la_cancion':
        if (x.k < 120_000) r.sway = true;
        else r.halo = true;
        break;
      case 'jardin_relojes':
        r.rate = 0.4;
        break;
      case 'puerta_pintada':
        if (x.k > 6500) {
          r.theme = 'pintada';
          r.ambient = 'pintura';
        }
        break;
      case 'descensor_ayer':
        r.ghost = true;
        break;
    }
  }
  return r;
}

export function drawScenes(layer: 'far' | 'near' | 'front', v: View, sc: Scene[], actors: Actor[] = []): void {
  for (const x of sc) {
    const def = SCENES[x.id];
    if (layer === 'far') def.far?.(v, x);
    else if (layer === 'near') def.near?.(v, x);
    else def.front?.(v, x, actors);
  }
}

export function sceneChips(sc: Scene[]): Chip[] {
  const out: Chip[] = [];
  for (const x of sc) {
    const c = SCENES[x.id].chip;
    if (!c || !Number.isFinite(x.left)) continue;
    const min = Math.ceil(x.left / 60_000);
    out.push({ text: `${c} · ${min} MIN`, color: x.id === 'marea_negra' || x.id === 'apagon' ? '#ff8a8a' : GOLD });
  }
  return out;
}

/** Rayo del estallido de Carga, del techo al objetivo, con ramas hacia las criaturas cercanas. */
export function drawBolt(v: View, x: number, y: number, seed: number, life: number, actors: Actor[]): void {
  const { ctx, u } = v;
  const a = clamp01(life / 0.3);
  ctx.strokeStyle = `rgba(159,216,255,${0.35 * a})`;
  ctx.lineWidth = Math.max(4, u * 0.45);
  bolt(ctx, x + (hash(seed) - 0.5) * u * 3, 0, x, y, seed, u * 1.6, 8);
  ctx.strokeStyle = `rgba(240,250,255,${0.95 * a})`;
  ctx.lineWidth = Math.max(1.5, u * 0.12);
  bolt(ctx, x + (hash(seed) - 0.5) * u * 3, 0, x, y, seed, u * 1.6, 8);
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(200,235,255,${0.7 * a})`;
  for (const ac of actors.slice(1, 3)) bolt(ctx, x, y, ac.x, ac.y, seed + ac.x, u, 5);
  ctx.globalAlpha = 0.6 * a;
  ctx.drawImage(glowSprite('#9fd8ff'), x - u * 2, y - u * 2, u * 4, u * 4);
  ctx.globalAlpha = 1;
}

const SIL = ['Ia', 'Ve', 'To', 'Fen', 'Ul', 'Dor', 'Mar', 'Si', 'Len', 'Ka', 'Ro', 'Bel', 'Nu', 'Tes', 'Ar', 'Vo', 'Li', 'Sa'];
/** Nombre procedural de un Descensor olvidado (determinista). */
function plateName(seed: number): string {
  const p = (k: number) => SIL[Math.floor(hash(seed * 1.37 + k) * SIL.length)];
  const nombre = p(1) + p(2).toLowerCase();
  const apellido = p(3) + p(4).toLowerCase() + (hash(seed + 9) > 0.5 ? p(5).toLowerCase() : '');
  return `${nombre} ${apellido}`;
}
