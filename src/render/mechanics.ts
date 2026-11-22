// Lectura visual de las mecánicas de sub-capa de Lo Hondo (EVENTOS_Y_RUTA.md §3). Solo dibuja:
// las reglas viven en core/ (worldMods.ts, creatures.ts, zone.ts, sim.ts). Todo se deriva del
// estado y del tiempo trabajado, así que se ve igual en el panel y en el overlay y no guarda nada.
import type { DayState } from '../core/types';
import { CARGA, PULSO } from '../core/worldMods';
import { RECUERDOS_CADA } from '../data/route';
import type { Suelo } from './background';
import { glowSprite } from './fx';
import { mix, rgba, type Ambient, type Theme, type ThemeVariant } from './theme';

/** Lo que necesita cualquier capa de dibujo de mecánicas y escenas. */
export interface View {
  ctx: CanvasRenderingContext2D;
  w: number;
  hgt: number;
  groundY: number;
  u: number;
  ppm: number;
  /** Tiempo de animación (ms; el Jardín de Relojes lo frena). */
  t: number;
  /** Metros recorridos por la cámara. */
  dist: number;
  ov: boolean;
  heroSX: number;
  /** Tiempo trabajado, suavizado entre estados (ms). */
  worked: number;
  theme: Theme;
}

/** Criatura ya dibujada, en coordenadas de pantalla (para ojos, notas, rayos…). */
export interface Actor {
  x: number;
  y: number;
  r: number;
  color: string;
  big: boolean;
}

export const hash = (n: number): number => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export const mod = (a: number, n: number) => ((a % n) + n) % n;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const TAU = Math.PI * 2;

export interface Mech {
  on: Set<string>;
  /** Respiración: 0 = contraído … 1 = expandido. */
  breath: number;
  inhale: boolean;
  breathLeft: number;
  /** Pulso: golpe visual del latido (doble, «pum-pum»), y si el daño extra está activo. */
  beat: number;
  beatOn: boolean;
  beatIn: number;
  /** Carga acumulada (0–1). */
  charge: number;
  /** Glitch: 1 durante una ráfaga de ruido. */
  glitch: number;
  /** Calma: ms hasta que vuelven las criaturas. */
  calmLeft: number;
  /** Escalada: tramos hasta la próxima costilla (0 = esta). */
  ribIn: number;
}

export function mechState(s: DayState, worked: number): Mech {
  const on = new Set(s.world.sub?.mecanicas ?? []);
  const ph = Math.floor(worked / 30_000) % 2;
  const e = 0.5 - 0.5 * Math.cos((Math.PI * (worked % 30_000)) / 30_000);
  const since = worked % PULSO.cadaMs;
  // Ráfagas de glitch: deterministas por ventana de 4,2 s (no tocan el RNG de la simulación).
  const win = Math.floor(worked / 4200);
  const start = hash(win + 0.5) * 2800;
  const local = worked % 4200;
  const sub = s.world.sub;
  return {
    on,
    breath: ph === 0 ? e : 1 - e,
    inhale: ph === 0,
    breathLeft: 30_000 - (worked % 30_000),
    beat: Math.exp(-since / 150) + (since > 280 ? 0.6 * Math.exp(-(since - 280) / 150) : 0),
    beatOn: since < PULSO.durMs,
    beatIn: PULSO.cadaMs - since,
    charge: (s.hero.hits % CARGA.cada) / CARGA.cada,
    glitch: on.has('glitch') && hash(win) > 0.3 && local >= start && local < start + 180 + hash(win + 0.7) * 650 ? 1 : 0,
    calmLeft: sub && on.has('calma') ? Math.max(0, sub.hora * 3_600_000 + 300_000 - worked) : 0,
    ribIn: (9 - (s.zone % 5)) % 5,
  };
}

/** Paleta, ambiente y suelo propios de cada mecánica. */
export const MECH_LOOK: Record<string, { theme?: ThemeVariant; ambient?: Ambient; suelo?: Suelo }> = {
  reflejos: { theme: 'mercurio', suelo: 'espejo' },
  carga: { theme: 'estatica', ambient: 'chispas' },
  respiracion: { theme: 'organico', suelo: 'membrana' },
  flotacion: { theme: 'vacio', ambient: 'deriva' },
  recuerdos: { theme: 'ahogado', ambient: 'burbujas' },
  ensamblaje: { theme: 'fabrica' },
  escalada: { theme: 'hueso', suelo: 'hueso' },
  dejavu: { theme: 'antiguo', ambient: 'polvo' },
  pulso: { theme: 'latido' },
  glitch: { theme: 'ruido', ambient: 'chispas' },
  calma: { theme: 'calma', ambient: 'luz', suelo: 'luz' },
};

const BONE = '#d9cfb8';
const SPARK = '#9fd8ff';
const CORR_COLORS = ['#ff3fa4', '#b6ff3f', '#3fe0b0'];

/** Relámpago quebrado entre dos puntos (determinista por semilla). */
export function bolt(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number, jag: number, segs = 7): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i < segs; i++) {
    const k = i / segs;
    ctx.lineTo(x0 + (x1 - x0) * k + (hash(seed + i * 3.1) - 0.5) * jag, y0 + (y1 - y0) * k + (hash(seed + i * 5.7) - 0.5) * jag * 0.4);
  }
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

// ---------- fondo lejano (detrás de las siluetas) ----------

export function mechFar(v: View, m: Mech): void {
  const { ctx, w, hgt, groundY: gy, t, u, ov } = v;
  const off = (f: number) => v.dist * v.ppm * f;

  if (m.on.has('calma')) {
    // El fondo es un cielo: luz blanca que sube desde abajo y haces anchos.
    ctx.globalAlpha = ov ? 0.4 : 0.6;
    ctx.drawImage(glowSprite('#fff4dc'), w * 0.5 - w * 0.75, gy - hgt * 0.6, w * 1.5, hgt * 1.4);
    const g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, 'rgba(255,250,235,1)');
    g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = g;
    for (let i = 0; i < 5; i++) {
      const bx = mod(i * 0.23 * w - off(0.015), w * 1.2) - w * 0.1;
      const sw = w * (0.025 + 0.03 * hash(i + 40));
      ctx.globalAlpha = (ov ? 0.05 : 0.08) * (0.6 + 0.4 * Math.sin(t / 2600 + i * 1.7));
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + sw, 0);
      ctx.lineTo(bx - sw * 0.2, gy);
      ctx.lineTo(bx - sw * 1.4, gy);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (m.on.has('reflejos')) {
    // Horizonte de mercurio: una línea plateada que tiembla.
    const hy = gy - (gy - hgt * 0.1) * 0.55;
    ctx.fillStyle = 'rgba(220,235,245,0.18)';
    ctx.fillRect(0, hy, w, 1);
    ctx.fillStyle = 'rgba(220,235,245,0.32)';
    for (let i = 0; i < 16; i++) {
      const x = mod(i * (w / 7) - off(0.05) + Math.sin(t / 900 + i) * 20, w + 60) - 30;
      ctx.fillRect(x, hy + 2 + (i % 3) * 3, 16 + hash(i) * 40, 1);
    }
  }

  if (m.on.has('carga')) {
    // Relámpagos lejanos entre las bóvedas.
    const win = Math.floor(t / 1700);
    if (hash(win) > 0.45 && t % 1700 < 150) {
      const x = hash(win + 1) * w;
      ctx.fillStyle = 'rgba(159,216,255,0.05)';
      ctx.fillRect(0, 0, w, gy);
      ctx.strokeStyle = 'rgba(190,230,255,0.55)';
      ctx.lineWidth = 1.5;
      bolt(ctx, x, 0, x + (hash(win + 2) - 0.5) * u * 6, gy * 0.65, win, u * 2.2);
    }
  }

  if (m.on.has('escalada')) {
    // La columna del gigante recorre el techo.
    const cw = u * 1.5;
    const o = off(0.12);
    const y0 = Math.max(2, hgt * 0.05);
    ctx.fillStyle = mix(v.theme.far, BONE, 0.35);
    for (let i = Math.floor(o / cw) - 1; i * cw - o < w + cw; i++) {
      const x = i * cw - o;
      ctx.fillRect(x, y0, cw * 0.78, u * 0.55);
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.2, y0 + u * 0.55);
      ctx.lineTo(x + cw * 0.39, y0 + u * (0.95 + 0.25 * hash(i)));
      ctx.lineTo(x + cw * 0.58, y0 + u * 0.55);
      ctx.fill();
    }
  }

  if (m.on.has('recuerdos')) {
    // Luz de superficie vista desde el agua: cáusticas que ondulan arriba.
    ctx.globalAlpha = ov ? 0.25 : 0.35;
    ctx.drawImage(glowSprite('#9fe6ff'), w * 0.5 - w * 0.6, -hgt * 0.5, w * 1.2, hgt * 0.9);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(159,230,255,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const y0 = hgt * (0.06 + k * 0.07);
      for (let x = 0; x <= w; x += 16) {
        const y = y0 + Math.sin(x * 0.02 + t / (700 + k * 300) + k) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  if (m.on.has('ensamblaje')) {
    // Plano de obra: una cuadrícula azul detrás de todo.
    const step = Math.max(14, u * 2);
    const o = mod(off(0.05), step);
    ctx.strokeStyle = 'rgba(63,224,230,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -o; x < w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, gy);
    }
    for (let y = gy; y > 0; y -= step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  if (m.on.has('flotacion')) {
    // Islas de roca que flotan en el vacío.
    ctx.fillStyle = mix(v.theme.far, '#cfe0ff', 0.12);
    for (let k = 0; k < 3; k++) {
      const x = mod(k * w * 0.45 - off(0.04), w * 1.35) - w * 0.15;
      const y = hgt * (0.2 + 0.18 * k) + Math.sin(t / 3200 + k * 2) * hgt * 0.05;
      const r = Math.min(w * 0.08, u * (3 + k));
      ctx.beginPath();
      ctx.moveTo(x - r, y);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x + r * 0.4, y + r * 0.5);
      ctx.lineTo(x, y + r * 0.95);
      ctx.lineTo(x - r * 0.5, y + r * 0.45);
      ctx.fill();
    }
  }

  if (m.on.has('pulso')) {
    // El fondo late: un resplandor rojo que se hincha con cada latido.
    ctx.globalAlpha = (ov ? 0.18 : 0.25) + (ov ? 0.25 : 0.4) * Math.min(1, m.beat);
    ctx.drawImage(glowSprite('#ff2040'), w * 0.5 - w * 0.55, gy * 0.5 - hgt * 0.7, w * 1.1, hgt * 1.4);
    ctx.globalAlpha = 1;
  }

  if (m.on.has('dejavu')) {
    // El sol viejo de la superficie, que aquí abajo no debería verse.
    const x = w * 0.78 - mod(off(0.01), w * 0.2);
    const r = Math.min(hgt * 0.16, u * 3);
    ctx.globalAlpha = 0.45;
    ctx.drawImage(glowSprite('#e9c27a'), x - r * 3, hgt * 0.22 - r * 3, r * 6, r * 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(243,220,160,0.35)';
    ctx.beginPath();
    ctx.arc(x, hgt * 0.22, r, 0, TAU);
    ctx.fill();
  }
}

// ---------- fondo cercano (delante de las siluetas, detrás de la cornisa) ----------

export function mechNear(v: View, m: Mech): void {
  const { ctx, w, hgt, groundY: gy, t, u, ov } = v;
  const off = (f: number) => v.dist * v.ppm * f;
  const each = (cw: number, f: number, fn: (i: number, x: number) => void) => {
    const o = off(f);
    for (let i = Math.floor(o / cw) - 1; i * cw - o < w + cw; i++) fn(i, i * cw - o);
  };

  if (m.on.has('carga')) {
    // Catedral de Estática: agujas con un orbe y arcos que saltan entre ellas.
    const cw = u * 9;
    const tops: [number, number][] = [];
    each(cw, 0.45, (i, x) => {
      if (hash(i + 70) < 0.35) return;
      const h = Math.min(gy * 0.92, hgt * (0.45 + 0.3 * hash(i + 71)));
      ctx.fillStyle = v.theme.near;
      ctx.beginPath();
      ctx.moveTo(x - u * 0.35, gy);
      ctx.lineTo(x, gy - h);
      ctx.lineTo(x + u * 0.35, gy);
      ctx.fill();
      // Ojiva entre agujas.
      ctx.strokeStyle = rgba(SPARK, 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + u * 1.2, gy);
      ctx.quadraticCurveTo(x + u * 1.2, gy - h * 0.7, x + cw * 0.5, gy - h * 0.8);
      ctx.quadraticCurveTo(x + cw - u * 1.2, gy - h * 0.7, x + cw - u * 1.2, gy);
      ctx.stroke();
      ctx.globalAlpha *= 0.7;
      ctx.drawImage(glowSprite(SPARK), x - u * 0.6, gy - h - u * 0.6, u * 1.2, u * 1.2);
      ctx.globalAlpha /= 0.7;
      tops.push([x, gy - h]);
    });
    ctx.strokeStyle = 'rgba(200,235,255,0.7)';
    ctx.lineWidth = 1.2;
    const win = Math.floor(t / 180);
    for (let k = 0; k + 1 < tops.length; k++) {
      if (hash(win * 13 + k) < 0.72) continue;
      bolt(ctx, tops[k][0], tops[k][1], tops[k + 1][0], tops[k + 1][1], win * 7 + k, u * 1.2, 6);
    }
  }

  if (m.on.has('respiracion')) {
    // Alveolos en las paredes: se hinchan al inspirar y se vacían al espirar.
    const k = 0.7 + 0.45 * m.breath;
    each(u * 7, 0.3, (i, x) => {
      const y = hgt * (0.12 + 0.55 * hash(i + 80));
      if (y > gy - u) return;
      const r = u * (0.9 + 1.2 * hash(i + 81)) * k;
      ctx.fillStyle = 'rgba(196,96,122,0.2)';
      ctx.strokeStyle = 'rgba(255,154,176,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.85, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,208,216,0.25)';
      ctx.fillRect(x - r * 0.4, y - r * 0.45, r * 0.3, r * 0.2);
    });
  }

  if (m.on.has('flotacion')) {
    // Cascotes que suben girando: aquí nada cae.
    const n = ov ? 6 : 10;
    ctx.fillStyle = rgba(v.theme.accent, 0.18);
    for (let i = 0; i < n; i++) {
      const x = mod(i * w * 0.137 - off(0.25), w + 40) - 20;
      const y = mod(hgt * hash(i + 90) - t * 0.006 * (0.5 + hash(i + 91)), hgt + 40) - 20;
      const s = u * (0.3 + 0.5 * hash(i + 92));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((t / 2000) * (hash(i + 93) - 0.5) * 4);
      ctx.fillRect(-s / 2, -s / 2, s, s * 0.7);
      ctx.restore();
    }
  }

  if (m.on.has('recuerdos')) {
    // Papeles del Archivo que flotan a la deriva.
    const n = ov ? 5 : 9;
    for (let i = 0; i < n; i++) {
      const x = mod(i * w * 0.17 - off(0.3) + Math.sin(t / 1500 + i) * u * 2, w + 40) - 20;
      const y = mod(hgt * hash(i + 100) + t * 0.004 * (0.5 + hash(i + 101)), hgt);
      const pw = u * 0.7;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t / 900 + i) * 0.6);
      ctx.fillStyle = 'rgba(225,238,245,0.32)';
      ctx.fillRect(-pw / 2, -pw * 0.35, pw, pw * 0.7);
      if (!ov) {
        ctx.fillStyle = 'rgba(40,70,90,0.35)';
        for (let l = 0; l < 3; l++) ctx.fillRect(-pw * 0.38, -pw * 0.2 + l * pw * 0.16, pw * 0.7, 1);
      }
      ctx.restore();
    }
  }

  if (m.on.has('ensamblaje')) {
    // Capas a medio hacer: andamios con tirantes y grúas que bajan bloques de las tres corrientes.
    each(u * 8, 0.3, (i, x) => {
      if (hash(i + 110) < 0.4) return;
      const h = Math.min(gy * 0.9, hgt * (0.3 + 0.4 * hash(i + 111)));
      const bw = u * 5;
      ctx.strokeStyle = 'rgba(255,179,71,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, gy - h);
      ctx.moveTo(x + bw, gy);
      ctx.lineTo(x + bw, gy - h);
      for (let y = gy; y > gy - h; y -= u * 1.6) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + bw, y);
        ctx.lineTo(x, y - u * 1.6);
      }
      ctx.stroke();
      if (i % 3 === 0) {
        // Grúa: mástil, pluma, cable y un bloque que baja y sube.
        const mx = x + bw * 0.5;
        const top = gy - h - u * 1.5;
        ctx.fillStyle = 'rgba(255,179,71,0.45)';
        ctx.fillRect(mx - 1, top, 2, h + u * 1.5);
        ctx.fillRect(mx - u * 3, top, u * 6, 2);
        const run = h * 0.75;
        const by = top + 4 + mod(t * 0.02 + i * 40, run);
        ctx.fillRect(mx + u * 2.5, top, 1, by - top);
        ctx.fillStyle = rgba(CORR_COLORS[mod(i, 3)], 0.7);
        ctx.fillRect(mx + u * 2, by, u, u * 0.7);
      }
    });
  }

  if (m.on.has('escalada')) {
    // Por dentro del gigante: costillas que arquean por encima del camino.
    each(u * 14, 0.55, (_i, x) => {
      ctx.beginPath();
      ctx.moveTo(x, gy + 4);
      ctx.quadraticCurveTo(x - u * 5, hgt * 0.15, x + u * 7, -u * 2);
      ctx.strokeStyle = 'rgba(60,48,36,0.55)';
      ctx.lineWidth = u * 0.95;
      ctx.stroke();
      ctx.strokeStyle = rgba(BONE, 0.42);
      ctx.lineWidth = u * 0.45;
      ctx.stroke();
    });
  }

  if (m.on.has('pulso')) {
    // Venas en las paredes que se encienden con cada latido.
    const a = 0.12 + 0.5 * Math.min(1, m.beat);
    ctx.strokeStyle = `rgba(255,77,94,${a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    each(u * 11, 0.2, (i, x) => {
      const fromTop = i % 2 === 0;
      const y0 = fromTop ? 0 : gy;
      const dir = fromTop ? 1 : -1;
      const len = gy * (0.3 + 0.3 * hash(i + 120));
      ctx.moveTo(x, y0);
      ctx.quadraticCurveTo(x + u * 2, y0 + dir * len * 0.5, x - u, y0 + dir * len);
      ctx.moveTo(x + u * 0.7, y0 + dir * len * 0.4);
      ctx.lineTo(x + u * 2.6, y0 + dir * len * 0.6);
    });
    ctx.stroke();
  }

  if (m.on.has('dejavu')) {
    // Farolas y tendido del tranvía de la ciudad antigua.
    ctx.fillStyle = 'rgba(40,30,20,0.7)';
    ctx.fillRect(0, gy - u * 4.3, w, 1);
    each(u * 10, 0.45, (i, x) => {
      if (hash(i + 130) < 0.3) return;
      ctx.fillStyle = 'rgba(40,30,20,0.85)';
      ctx.fillRect(x, gy - u * 3.8, 2, u * 3.8);
      ctx.fillRect(x - u * 0.25, gy - u * 3.9, u * 0.5 + 2, u * 0.2);
      ctx.globalAlpha *= 0.65;
      ctx.drawImage(glowSprite('#f3c46e'), x - u * 0.8, gy - u * 4.6, u * 1.6, u * 1.6);
      ctx.globalAlpha /= 0.65;
    });
  }
}

// ---------- capa delantera (sobre los actores) ----------

export function mechFront(v: View, m: Mech, alive: boolean): void {
  const { ctx, w, hgt, groundY: gy, t, u, ov, heroSX } = v;

  if (m.on.has('carga') && alive) {
    // Medidor de carga: diez puntos alrededor del Descensor; cerca del estallido, chispas.
    const n = Math.round(m.charge * CARGA.cada);
    const cx = heroSX;
    const cy = gy - u * 1.05;
    const r = u * 1.3;
    for (let i = 0; i < CARGA.cada; i++) {
      const a = -Math.PI / 2 + (i / CARGA.cada) * TAU;
      const lit = i < n;
      ctx.fillStyle = lit ? SPARK : 'rgba(159,216,255,0.18)';
      const s = Math.max(2, u * (lit ? 0.16 : 0.11));
      ctx.fillRect(cx + Math.cos(a) * r - s / 2, cy + Math.sin(a) * r - s / 2, s, s);
    }
    if (m.charge >= 0.7) {
      ctx.strokeStyle = `rgba(200,235,255,${0.4 + 0.5 * m.charge})`;
      ctx.lineWidth = 1;
      const win = Math.floor(t / 90);
      for (let k = 0; k < 2; k++) {
        const a = hash(win + k * 9) * TAU;
        bolt(ctx, cx + Math.cos(a) * r * 0.4, cy + Math.sin(a) * r * 0.4, cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 1.1, win + k, u * 0.5, 3);
      }
    }
  }

  if (m.on.has('pulso')) {
    const b = Math.min(1, m.beat);
    if (ov) {
      // En la franja: un velo rojo muy suave y el borde del suelo que late.
      ctx.fillStyle = `rgba(255,40,60,${0.03 + 0.12 * b})`;
      ctx.fillRect(0, 0, w, hgt);
    } else {
      const vg = ctx.createRadialGradient(w / 2, hgt / 2, Math.min(w, hgt) * 0.3, w / 2, hgt / 2, Math.max(w, hgt) * 0.75);
      vg.addColorStop(0, 'rgba(140,0,20,0)');
      vg.addColorStop(1, `rgba(140,0,20,${0.15 + 0.35 * b})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, hgt);
    }
    ctx.fillStyle = `rgba(255,77,94,${0.3 + 0.6 * b})`;
    ctx.fillRect(0, gy - 1, w, 2);
    if (m.beatOn && alive) {
      // Daño extra: el Descensor arde en rojo mientras dura.
      const k = 1 - (PULSO.cadaMs - m.beatIn) / PULSO.durMs;
      ctx.globalAlpha = 0.35 + 0.4 * k;
      ctx.drawImage(glowSprite('#ff4d5e'), heroSX - u * 2, gy - u * 3, u * 4, u * 4);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255,77,94,${0.5 * k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(heroSX, gy - u, u * (1.2 + (1 - k) * 0.8), 0, TAU);
      ctx.stroke();
    }
  }

  if (m.on.has('glitch')) {
    // Interferencias permanentes: líneas de color que saltan y bloques de ruido (más en las ráfagas).
    const f = Math.floor(t / 90);
    const n = m.glitch ? 5 : 2;
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = k % 2 ? 'rgba(63,224,230,0.22)' : 'rgba(255,63,164,0.22)';
      ctx.fillRect(0, hash(f * 5 + k) * hgt, w, 1 + Math.floor(hash(f + k * 7) * 2));
    }
    const blocks = (ov ? 6 : 12) * (m.glitch ? 3 : 1);
    for (let k = 0; k < blocks; k++) {
      ctx.fillStyle = ['rgba(255,63,164,0.5)', 'rgba(63,224,230,0.5)', 'rgba(255,255,255,0.4)'][k % 3];
      ctx.fillRect(hash(f * 3 + k * 1.3) * w, hash(f * 1.9 + k) * hgt, 2 + hash(k + f) * u * 0.8, 2);
    }
  }

  if (m.on.has('calma')) {
    ctx.fillStyle = 'rgba(255,250,235,0.05)';
    ctx.fillRect(0, 0, w, hgt);
  }

  if (m.on.has('dejavu')) {
    // Película vieja: rayas verticales y grano.
    const f = Math.floor(t / 70);
    ctx.fillStyle = 'rgba(240,225,190,0.16)';
    for (let k = 0; k < 2; k++) if (hash(f + k * 31) > 0.45) ctx.fillRect(hash(f * 3 + k) * w, 0, 1, hgt);
    ctx.fillStyle = 'rgba(30,20,10,0.25)';
    const n = ov ? 14 : 36;
    for (let i = 0; i < n; i++) ctx.fillRect(hash(f + i * 1.3) * w, hash(f * 1.7 + i) * hgt, 1.5, 1.5);
  }
}

// ---------- criaturas ----------

/**
 * Flotación: las criaturas llegan desde arriba o desde abajo y se colocan a la altura del
 * Descensor al acercarse. Devuelve el desplazamiento vertical en px.
 */
export function floatOffset(v: View, cx: number, distM: number): number {
  const side = hash(Math.round(cx * 10)) < 0.5 ? -1 : 1;
  const a = clamp01((distM - 10) / 45);
  return side * a * a * v.hgt * 0.55 + Math.sin(v.t / 700 + cx) * v.u * 0.25 - v.u * 0.35;
}

/** Costilla del Gigante (Umbral de la Escalada): un arco de hueso con una membrana por puerta. */
export function drawRibGate(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number, t: number, hpFrac: number): void {
  const hw = u * 0.9;
  const h = u * 2.4;
  // Membrana: se apaga a medida que la puerta cede.
  ctx.fillStyle = `rgba(255,154,120,${0.12 + 0.35 * hpFrac})`;
  ctx.beginPath();
  ctx.moveTo(x - hw, gy);
  ctx.quadraticCurveTo(x - hw, gy - h * 1.05, x, gy - h);
  ctx.quadraticCurveTo(x + hw, gy - h * 1.05, x + hw, gy);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,200,170,${0.25 + 0.3 * Math.sin(t / 300) ** 2})`;
  ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(x - hw + (k * hw) / 2, gy);
    ctx.lineTo(x - hw + (k * hw) / 2 + Math.sin(t / 500 + k) * 2, gy - h * 0.8);
    ctx.stroke();
  }
  // Las dos costillas que se cruzan arriba.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * hw * 1.25, gy);
    ctx.quadraticCurveTo(x + side * hw * 1.3, gy - h * 1.2, x - side * hw * 0.35, gy - h * 1.15);
    ctx.strokeStyle = '#3a2e22';
    ctx.lineWidth = u * 0.5;
    ctx.stroke();
    ctx.strokeStyle = BONE;
    ctx.lineWidth = u * 0.3;
    ctx.stroke();
  }
  // Ojo en la clave del arco.
  ctx.fillStyle = '#05060c';
  ctx.fillRect(x - u * 0.15, gy - h * 1.1, u * 0.3, u * 0.22);
  ctx.fillStyle = '#ff4d5e';
  ctx.fillRect(x - u * 0.05, gy - h * 1.08, u * 0.1, u * 0.1);
}

// ---------- marcadores (HUD del panel y esquina del overlay) ----------

export interface Chip {
  text: string;
  color: string;
}

const secs = (ms: number) => `${Math.ceil(ms / 1000)} s`;
const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function mechChips(m: Mech, s: DayState): Chip[] {
  const out: Chip[] = [];
  for (const id of m.on) {
    switch (id) {
      case 'carga':
        out.push({ text: `⚡ CARGA ${Math.round(m.charge * CARGA.cada)}/${CARGA.cada}`, color: SPARK });
        break;
      case 'respiracion':
        out.push({ text: m.inhale ? `▲ SE EXPANDE · VEL ×1,5 · ${secs(m.breathLeft)}` : `▼ SE CONTRAE · VEL ×0,75 · ${secs(m.breathLeft)}`, color: '#ff9ab0' });
        break;
      case 'pulso':
        out.push(m.beatOn ? { text: `♥ LATIDO · DAÑO ×${String(PULSO.mult).replace('.', ',')}`, color: '#ff4d5e' } : { text: `♥ LATIDO EN ${secs(m.beatIn)}`, color: '#ff8a8a' });
        break;
      case 'recuerdos': {
        const r = s.world.recuerdos;
        out.push({ text: `◈ RECUERDOS ${r} · FRAGMENTO EN ${RECUERDOS_CADA - (r % RECUERDOS_CADA)}`, color: '#9fe6ff' });
        break;
      }
      case 'escalada':
        out.push({ text: m.ribIn === 0 ? '⌒ COSTILLA EN ESTE TRAMO' : `⌒ COSTILLA EN ${m.ribIn} TRAMO${m.ribIn > 1 ? 'S' : ''}`, color: BONE });
        break;
      case 'calma':
        if (m.calmLeft > 0) out.push({ text: `☼ SILENCIO · CRIATURAS EN ${mmss(m.calmLeft)}`, color: '#fff4dc' });
        break;
      case 'reflejos':
        out.push({ text: '◇ SUELO ESPEJO · BOTÍN DEL REFLEJO', color: '#cfe3ee' });
        break;
      case 'glitch':
        out.push({ text: '▒ FRONTERA DE RUIDO · NOMBRES CORRUPTOS', color: '#ff7ac2' });
        break;
    }
  }
  return out;
}
