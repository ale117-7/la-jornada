// Fondo del abismo: cielo, haces de luz, siluetas con parallax por corriente, la Base Colgante,
// partículas de ambiente y la cornisa. Todo se deriva de la distancia recorrida y del tiempo
// (sin estado), así que dibujarlo dos veces da lo mismo.
import { BUILDING_BY_ID } from '../data/buildings';
import type { Corriente } from '../data/tags';
import { BUILDING_ART } from './art/catalog';
import { resolve, rowLength } from './art/sprites';
import { glowSprite } from './fx';
import { rgba, type Ambient, type Theme } from './theme';

/** Suelo propio de una sub-capa (Reflejos, Respiración, Escalada, Calma). */
export type Suelo = 'espejo' | 'membrana' | 'hueso' | 'luz';

export interface BgParams {
  w: number;
  hgt: number;
  groundY: number;
  /** Metros recorridos (tramo × 500 + posición). */
  dist: number;
  ppm: number;
  u: number;
  t: number;
  theme: Theme;
  corriente: Corriente | null;
  /** 0 = superficie … 1 = muy hondo (15 km). */
  dark: number;
  overlay: boolean;
  /** Desplazamiento vertical del descenso entre capas (px; 0 en reposo). */
  drop: number;
  /** Módulos de la Base Colgante (0 = aún no hay Base). */
  base: number;
  /** Edificios construidos y su nivel (para dibujar cada módulo con su arte). */
  buildings?: [string, number][];
  /** Hoja de escenario (bandas de parallax y suelo) del momento. */
  scenery?: string;
  /** Lo Hondo: siluetas gigantes y más bioluminiscencia. */
  hondo: boolean;
  /** Ensamblaje: las casillas alternan las tres corrientes, cada una con su paleta. */
  mezcla?: Record<Corriente, Theme>;
  /** Déjà vu: la megaciudad antigua (torres con frontón y ventanas cálidas). */
  antiguo?: boolean;
  suelo?: Suelo;
  /** Sustituye a las partículas de ambiente de la corriente. */
  ambient?: Ambient;
  /** Respiración: 0–1 (la membrana del suelo se estira). */
  breath?: number;
  /** Capas extra de mecánicas y escenas: detrás de las siluetas y delante de ellas. */
  far?: () => void;
  near?: () => void;
}

const MEZCLA: Corriente[] = ['N', 'S', 'A'];

/** Ruido determinista 0–1 por casilla y capa. */
export function noise(i: number, layer: number): number {
  const v = Math.sin(i * 127.1 + layer * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function drawBackground(ctx: CanvasRenderingContext2D, p: BgParams): void {
  const { w, hgt, groundY, theme: T, overlay: ov } = p;

  // ----- cielo (en el overlay, una franja translúcida que deja ver la app de debajo) -----
  if (ov) {
    const og = ctx.createLinearGradient(0, 0, 0, hgt);
    og.addColorStop(0, 'rgba(5,7,14,0)');
    og.addColorStop(0.45, rgba(T.skyBottom, 0.35));
    og.addColorStop(1, rgba(T.skyBottom, 0.72));
    ctx.fillStyle = og;
    ctx.fillRect(0, 0, w, hgt);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, hgt);
    g.addColorStop(0, T.skyTop);
    g.addColorStop(1, T.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hgt);
  }

  // ----- haces de luz desde arriba: se apagan con la profundidad -----
  const shaftA = (ov ? 0.035 : 0.07) * (1 - p.dark) ** 1.5;
  if (shaftA > 0.004) {
    for (let i = 0; i < 4; i++) {
      const bx = mod(i * 0.29 * w - p.dist * p.ppm * 0.02, w * 1.3) - w * 0.15;
      const sw = w * (0.04 + 0.05 * noise(i, 3));
      const lg = ctx.createLinearGradient(0, 0, 0, groundY);
      lg.addColorStop(0, `rgba(${T.shaft},${shaftA * (0.6 + 0.4 * Math.sin(p.t / 2300 + i))})`);
      lg.addColorStop(1, `rgba(${T.shaft},0)`);
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + sw, 0);
      ctx.lineTo(bx - sw * 0.6, groundY);
      ctx.lineTo(bx - sw * 1.6, groundY);
      ctx.fill();
    }
  }

  const farHook = () => {
    if (!p.far) return;
    const a = ctx.globalAlpha;
    ctx.globalAlpha = 1;
    p.far();
    ctx.globalAlpha = a;
  };

  const alpha = ov ? 0.55 : 1;
  ctx.globalAlpha = alpha;

  // ----- el escenario dibujado (bandas de parallax); si aún no ha cargado, las siluetas -----
  // Lo lejano de mecánicas y escenas (luna, ojo, relojes…) va entre la banda media y la cercana.
  const art = drawScenery(ctx, p, farHook);
  if (!art) {
    ctx.globalAlpha = 1;
    farHook();
    ctx.globalAlpha = alpha;
  }
  if (art) {
    ctx.globalAlpha = ov ? 0.8 : 1;
    if (p.base > 0) drawBase(ctx, p);
    ctx.globalAlpha = 1;
    if (p.near) {
      ctx.globalAlpha = ov ? 0.75 : 1;
      p.near();
      ctx.globalAlpha = 1;
    }
    ambient(ctx, p);
    ledge(ctx, p, art);
    return;
  }

  // ----- siluetas gigantes a lo lejos (más visibles en Lo Hondo) -----
  giants(ctx, p);

  // ----- tres capas de parallax, con forma propia por corriente -----
  const layers = [
    { f: 0.08, cw: 150, color: T.far, hMin: 0.3, hVar: 0.35 },
    { f: 0.2, cw: 105, color: T.mid, hMin: 0.16, hVar: 0.3 },
    { f: 0.45, cw: 72, color: T.near, hMin: 0.06, hVar: 0.18 },
  ];
  // Ensamblaje: cada casilla es de una corriente; Déjà vu: siempre la ciudad (antigua).
  const mz = p.mezcla ? MEZCLA.map((c) => ({ ...p, corriente: c, theme: p.mezcla![c] })) : null;
  const pa = p.antiguo ? { ...p, corriente: 'N' as Corriente } : p;
  layers.forEach((L, li) => {
    const off = p.dist * p.ppm * L.f;
    const first = Math.floor(off / L.cw) - 1;
    const dy = p.drop * (0.3 + li * 0.35);
    for (let i = first; i <= first + Math.ceil(w / L.cw) + 2; i++) {
      if (noise(i, li + 10) < 0.22) continue; // huecos
      const x = i * L.cw - off;
      const h = hgt * (L.hMin + L.hVar * noise(i, li));
      if (mz) {
        const q = mz[mod(i + li, 3)];
        tile(ctx, q, li, i, x, L.cw, h, [q.theme.far, q.theme.mid, q.theme.near][li], dy);
      } else tile(ctx, pa, li, i, x, L.cw, h, L.color, dy);
    }
  });

  ctx.globalAlpha = ov ? 0.8 : 1;
  if (p.base > 0) drawBase(ctx, p);
  ctx.globalAlpha = 1;
  if (p.near) {
    ctx.globalAlpha = ov ? 0.75 : 1;
    p.near();
    ctx.globalAlpha = 1;
  }

  ambient(ctx, p);
  ledge(ctx, p);
}

// ---------- escenarios dibujados ----------

/** Resultado del escenario: la textura del suelo y su escala, para la cornisa. */
interface SceneryInfo {
  strip: HTMLCanvasElement | null;
}

const bandCache = new Map<string, HTMLCanvasElement>();
function cached(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = bandCache.get(key);
  if (!c) {
    if (bandCache.size > 24) bandCache.clear();
    c = make();
    bandCache.set(key, c);
  }
  return c;
}

/** Banda reescalada a `h` px con el borde de arriba fundido (para que las capas se mezclen). */
function bandCanvas(img: HTMLImageElement, f: number[], h: number, fadeTop: number, cutBottom: number): HTMLCanvasElement {
  return cached(`${img.src}|${f[1]},${f[2]}|${h}|${fadeTop}|${cutBottom}`, () => {
    const srcH = f[4] * (1 - cutBottom);
    const k = h / f[4];
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(f[3] * k));
    c.height = Math.max(1, Math.round(srcH * k));
    const x = c.getContext('2d')!;
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, f[1], f[2], f[3], srcH, 0, 0, c.width, c.height);
    if (fadeTop > 0) {
      x.globalCompositeOperation = 'destination-in';
      const g = x.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(fadeTop, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      x.fillStyle = g;
      x.fillRect(0, 0, c.width, c.height);
    }
    return c;
  });
}

/** Franja de suelo: la fila «suelo» de la hoja o el pie de la banda más cercana. */
function stripCanvas(img: HTMLImageElement, f: number[], k: number, part: number): HTMLCanvasElement {
  return cached(`${img.src}|strip|${f[1]},${f[2]}|${k.toFixed(3)}|${part}`, () => {
    const sh = f[4] * part;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(f[3] * k));
    c.height = Math.max(1, Math.round(sh * k));
    const x = c.getContext('2d')!;
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, f[1], f[2] + f[4] - sh, f[3], sh, 0, 0, c.width, c.height);
    return c;
  });
}

/** Repite un lienzo en horizontal, alternando espejos para que no se noten las costuras. */
function tileRow(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, off: number, y: number, w: number): void {
  const tw = c.width;
  if (tw < 2) return;
  const first = Math.floor(off / tw);
  for (let i = first; i * tw - off < w; i++) {
    const x = Math.round(i * tw - off);
    if (mod(i, 2) === 1) {
      ctx.save();
      ctx.translate(x + tw, y);
      ctx.scale(-1, 1);
      ctx.drawImage(c, 0, 0);
      ctx.restore();
    } else ctx.drawImage(c, x, y);
  }
}

/**
 * Bandas del escenario de la capa (lejana, media y cercana) con parallax. Devuelve null si la hoja
 * aún no ha cargado (el llamador dibuja entonces las siluetas geométricas).
 */
function drawScenery(ctx: CanvasRenderingContext2D, p: BgParams, beforeNear: () => void): SceneryInfo | null {
  const id = p.scenery;
  if (!id) return null;
  const n = rowLength(id, 'banda');
  if (!n) return null;
  const bands = [];
  for (let i = 1; i <= n; i++) {
    const r = resolve(id, ['banda', i]);
    if (!r) return null;
    bands.push(r);
  }
  const { w, groundY: gy, overlay: ov, theme: T } = p;
  // Alto (relativo a la cornisa), pie y parallax de cada banda; la última es la más cercana.
  const specs =
    n >= 3
      ? [
          { f: 0.05, h: 0.62, bottom: 0.72, haze: 0.34 },
          { f: 0.16, h: 0.56, bottom: 0.93, haze: 0.14 },
          { f: 0.42, h: 0.66, bottom: 1.1, haze: 0 },
        ]
      : n === 2
        ? [
            { f: 0.1, h: 0.7, bottom: 0.86, haze: 0.22 },
            { f: 0.42, h: 0.66, bottom: 1.1, haze: 0 },
          ]
        : [{ f: 0.35, h: 0.9, bottom: 1.08, haze: 0 }];
  const used = bands.slice(-specs.length);
  // En el overlay solo las dos más cercanas, más transparentes: debajo están las apps.
  const start = ov && used.length >= 3 ? 1 : 0;
  let nearK = 1;
  let near: (typeof bands)[number] | null = null;
  const a0 = ctx.globalAlpha;
  for (let li = start; li < used.length; li++) {
    const sp = specs[li];
    const b = used[li];
    const H = Math.max(8, Math.round(gy * sp.h));
    const last = li === used.length - 1;
    if (last) {
      ctx.globalAlpha = a0;
      beforeNear();
    }
    const c = bandCanvas(b.img, b.f, H, ov ? 0.45 : 0.3, 0);
    const yb = gy * sp.bottom + p.drop * (0.3 + li * 0.35);
    ctx.globalAlpha = a0 * (ov ? (last ? 0.85 : 0.6) : 1);
    tileRow(ctx, c, p.dist * p.ppm * sp.f, yb - c.height, w);
    if (sp.haze > 0 && !ov) {
      ctx.globalAlpha = a0;
      ctx.fillStyle = rgba(T.skyBottom, sp.haze);
      ctx.fillRect(0, yb - c.height * 0.7, w, c.height * 0.7);
    }
    if (last) {
      near = b;
      nearK = H / b.f[4];
      // La banda cercana queda un paso por detrás de la acción: algo más oscura.
      ctx.globalAlpha = a0;
      const g = ctx.createLinearGradient(0, yb - c.height, 0, gy);
      g.addColorStop(0, 'rgba(3,4,10,0)');
      g.addColorStop(0.35, `rgba(3,4,10,${ov ? 0.15 : 0.3})`);
      g.addColorStop(1, `rgba(3,4,10,${ov ? 0.25 : 0.42})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, yb - c.height, w, gy - (yb - c.height));
    }
  }
  ctx.globalAlpha = a0;
  // La hondura oscurece el escenario (la luz de arriba ya no llega).
  if (p.dark > 0.05) {
    // En Lo Hondo cada sub-capa ya trae su paleta: apenas se oscurece.
    ctx.fillStyle = `rgba(3,4,10,${(p.hondo ? 0.15 : Math.min(0.5, p.dark * 0.5)) * (ov ? 0.5 : 1)})`;
    ctx.fillRect(0, 0, w, gy);
  }
  // Suelo: fila propia o el pie de la banda cercana, a la escala de esa banda.
  let strip: HTMLCanvasElement | null = null;
  const sr = rowLength(id, 'suelo') ? resolve(id, ['suelo', 1]) : null;
  if (sr && near) strip = stripCanvas(sr.img, sr.f, nearK, 1);
  else if (near) strip = stripCanvas(near.img, near.f, nearK, 0.17);
  return { strip };
}

// ---------- casillas de cada capa ----------

function tile(ctx: CanvasRenderingContext2D, p: BgParams, li: number, i: number, x: number, cw: number, h: number, color: string, dy: number): void {
  const { groundY: gy, theme: T, t } = p;
  const bw = cw * (0.62 + 0.25 * noise(i, li + 20));
  const top = gy - h + dy;
  ctx.fillStyle = color;
  switch (p.corriente) {
    case 'N': {
      // Torres de la ciudad vertical, con ventanas encendidas y anuncios holográficos.
      ctx.fillRect(x, top, bw, h);
      if (p.antiguo && li < 2) {
        // La ciudad antigua: frontones y cornisas de piedra.
        ctx.beginPath();
        ctx.moveTo(x - 2, top);
        ctx.lineTo(x + bw / 2, top - Math.min(bw * 0.32, h * 0.2));
        ctx.lineTo(x + bw + 2, top);
        ctx.fill();
        ctx.fillRect(x - 2, top + h * 0.3, bw + 4, 2);
      }
      if (li < 2) {
        if (!p.antiguo && noise(i, 40) > 0.5) ctx.fillRect(x + bw * 0.45, top - h * 0.12, 2, h * 0.12); // antena
        const cols = Math.max(1, Math.floor(bw / 9));
        const rows = Math.max(1, Math.floor(h / 11));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const n = noise(i * 31 + r * 7 + c, li + 50);
            if (n < 0.78) continue;
            const flick = n > 0.985 && Math.sin(t / 140 + i) > 0.6 ? 0.25 : 1;
            ctx.globalAlpha *= flick;
            ctx.fillStyle = rgba(T.lights[Math.floor(n * 97) % T.lights.length], li === 0 ? 0.5 : 0.75);
            ctx.fillRect(x + 3 + c * 9, top + 4 + r * 11, 3, 4);
            ctx.globalAlpha /= flick;
          }
        }
        if (li === 1 && !p.antiguo && noise(i, 60) > 0.72) {
          // Cartel holográfico: parpadea de vez en cuando.
          const on = Math.sin(t / 900 + i * 3) > -0.7 ? 1 : 0.3;
          ctx.strokeStyle = rgba(noise(i, 61) > 0.5 ? T.accent : T.accent2, 0.55 * on);
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + bw * 0.15, top + h * 0.15, bw * 0.7, Math.min(h * 0.2, 18));
        }
      } else {
        // Tuberías y cables entre torres cercanas.
        ctx.fillRect(x - cw * 0.2, gy - h * 0.45 + dy, cw * 1.2, 3);
      }
      break;
    }
    case 'S': {
      // Monolitos y bloques escalonados, con señalética enorme y franjas de seguridad.
      ctx.fillRect(x, top, bw, h);
      if (li === 1) ctx.fillRect(x + bw * 0.15, top - h * 0.18, bw * 0.7, h * 0.18);
      if (li === 0 && noise(i, 70) > 0.45 && h > 40) {
        ctx.fillStyle = rgba('#e8e6df', 0.07);
        ctx.font = `bold ${Math.round(Math.min(bw * 0.7, h * 0.4))}px monospace`;
        ctx.fillText(String(Math.floor(noise(i, 71) * 90) + 10).padStart(2, '0'), x + 4, top + h * 0.45);
      }
      if (noise(i, 72) > 0.7) {
        ctx.fillStyle = rgba(li === 2 ? T.accent2 : T.accent, li === 0 ? 0.25 : 0.5);
        ctx.fillRect(x, top + h * 0.22, bw, 2);
      }
      break;
    }
    case 'A': {
      if (li === 0) {
        // Árboles gigantes que crecen hacia abajo: copas colgando desde arriba.
        const rootH = p.hgt * (0.25 + 0.35 * noise(i, 80));
        ctx.beginPath();
        ctx.moveTo(x - bw * 0.2, dy * 0.5);
        ctx.lineTo(x + bw * 1.2, dy * 0.5);
        ctx.lineTo(x + bw * 0.55, rootH + dy * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x + bw * 0.45, gy - h * 0.6 + dy, bw * 0.18, h * 0.6);
      } else if (li === 1) {
        // Lianas con frutos luminosos.
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const len = p.hgt * (0.2 + 0.4 * noise(i, 81));
        const sway = Math.sin(t / 1700 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(x + bw * 0.5, 0);
        ctx.quadraticCurveTo(x + bw * 0.5 + sway * 2, len * 0.6, x + bw * 0.5 + sway, len);
        ctx.stroke();
        const lc = T.lights[Math.floor(noise(i, 82) * T.lights.length)];
        ctx.fillStyle = rgba(lc, 0.85);
        ctx.beginPath();
        ctx.arc(x + bw * 0.5 + sway, len + 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        if (p.dark > 0.35 && noise(i, 83) > 0.4) {
          const gs = 18;
          ctx.drawImage(glowSprite(lc), x + bw * 0.5 + sway - gs / 2, len + 3 - gs / 2, gs, gs);
        }
        // Setas en el suelo.
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x + bw * 0.3, gy - h * 0.35 + dy, bw * 0.35, h * 0.12, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x + bw * 0.27, gy - h * 0.35 + dy, bw * 0.06, h * 0.35);
      } else {
        // Raíces y helechos cerca.
        ctx.beginPath();
        ctx.moveTo(x, gy + dy);
        ctx.quadraticCurveTo(x + bw * 0.3, gy - h + dy, x + bw * 0.55, gy - h * 0.6 + dy);
        ctx.quadraticCurveTo(x + bw * 0.7, gy - h * 0.2 + dy, x + bw, gy + dy);
        ctx.fill();
      }
      break;
    }
    default:
      ctx.fillRect(x, top, bw, h);
  }
}

function giants(ctx: CanvasRenderingContext2D, p: BgParams): void {
  const { w, hgt, groundY: gy } = p;
  const a = p.hondo ? 0.55 : 0.28;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = p.theme.far;
  const span = w * 1.6;
  for (let k = 0; k < 2; k++) {
    const x = mod(k * span * 0.55 - p.dist * p.ppm * 0.02, span) - w * 0.3;
    const s = hgt * (0.7 + 0.3 * noise(k, 90));
    ctx.beginPath();
    switch (p.corriente) {
      case 'S': // esfera colosal, perfecta
        ctx.arc(x, gy - s * 0.55 + p.drop * 0.15, s * 0.5, 0, Math.PI * 2);
        break;
      case 'A': // bestia enorme que cruza el vacío
        ctx.ellipse(x, gy - s * 0.75 + p.drop * 0.15 + Math.sin(p.t / 3000 + k) * 6, s * 0.9, s * 0.22, -0.08, 0, Math.PI * 2);
        break;
      default: // arco de una megaestructura
        ctx.rect(x - s * 0.5, gy - s + p.drop * 0.15, s * 0.12, s);
        ctx.rect(x + s * 0.38, gy - s + p.drop * 0.15, s * 0.12, s);
        ctx.rect(x - s * 0.5, gy - s + p.drop * 0.15, s, s * 0.1);
    }
    ctx.fill();
    // En Lo Hondo, las siluetas tienen ojos.
    if (p.hondo) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(glowSprite(p.theme.accent), x - 10, gy - s * 0.7 + p.drop * 0.15 - 10, 20, 20);
      ctx.globalAlpha = a;
    }
  }
  ctx.restore();
}

/** La Base Colgante: crece con cada edificio, colgada de cables sobre el vacío. */
function drawBase(ctx: CanvasRenderingContext2D, p: BgParams): void {
  if (drawBaseArt(ctx, p)) return;
  const { w, hgt, u, theme: T } = p;
  const n = Math.min(p.base, 16);
  const box = Math.max(5, u * (p.overlay ? 0.55 : 0.8));
  const perRow = n <= 4 ? n : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / perRow);
  const cx = w * (p.overlay ? 0.9 : 0.84);
  const bottom = Math.min(p.groundY - box * 1.5, hgt * (p.overlay ? 0.62 : 0.5));
  const top = bottom - rows * box * 1.15;
  const sway = Math.sin(p.t / 1900) * box * 0.25;
  ctx.strokeStyle = rgba(T.ledgeEdge, 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - box * 1.2, 0);
  ctx.lineTo(cx - box * 0.8 + sway, top);
  ctx.moveTo(cx + box * 1.2, 0);
  ctx.lineTo(cx + box * 0.8 + sway, top);
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    const inRow = Math.min(perRow, n - r * perRow);
    const x = cx + sway - (inRow * box * 1.1) / 2 + c * box * 1.1;
    const y = top + r * box * 1.15;
    ctx.fillStyle = T.near;
    ctx.fillRect(x, y, box, box);
    ctx.fillStyle = rgba(T.lights[i % T.lights.length], 0.8);
    ctx.fillRect(x + box * 0.3, y + box * 0.3, box * 0.35, box * 0.3);
  }
  // Plataforma inferior.
  ctx.fillStyle = T.ledgeEdge;
  ctx.fillRect(cx + sway - perRow * box * 0.6, top + rows * box * 1.15, perRow * box * 1.2, 2);
}

/** Cuadro de un módulo según su nivel (bajo, medio, máximo) y la corriente del día. */
function moduleRef(id: string, nivel: number, corr: Corriente | null, t: number): [number, number] | null {
  const a = BUILDING_ART[id];
  if (!a) return null;
  const max = BUILDING_BY_ID[id]?.maxNivel ?? 10;
  const k = nivel / max;
  const tier = k >= 0.99 ? 2 : k >= 0.45 ? 1 : 0;
  const row = a.levels[tier];
  const n = rowLength(a.sheet, row);
  if (!n) return null;
  if (id === 'montacargas') return [row, Math.min(n, tier * 2 + 1 + (Math.floor(t / 700) % 2))]; // humo: 2 cuadros por nivel
  if (a.cols && n >= 3) return [row, Math.min(n, a.cols[corr ?? 'N'])];
  return [row, n >= 2 ? 1 + (Math.floor(t / 900) % 2) : 1]; // luz o humo: 2 cuadros
}

/** La Base Colgante con el arte de cada módulo, colgada de cables. false si aún no ha cargado. */
function drawBaseArt(ctx: CanvasRenderingContext2D, p: BgParams): boolean {
  const list = (p.buildings ?? []).slice(0, 16);
  if (!list.length) return false;
  const items = [];
  for (const [id, nivel] of list) {
    const ref = moduleRef(id, nivel, p.corriente, p.t);
    const r = ref ? resolve(BUILDING_ART[id].sheet, ref) : null;
    if (!r) return false;
    items.push(r);
  }
  const { w, hgt, u, theme: T } = p;
  const n = items.length;
  const mh = Math.max(9, u * (p.overlay ? 0.85 : 1.35));
  const perRow = n <= 4 ? n : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / perRow);
  const cellW = mh * 1.55;
  const cx = w * (p.overlay ? 0.88 : 0.83);
  const bottom = Math.min(p.groundY - mh * 0.8, hgt * (p.overlay ? 0.7 : 0.55));
  const top = bottom - rows * mh * 1.05;
  const sway = Math.sin(p.t / 1900) * mh * 0.12;
  ctx.strokeStyle = rgba(T.ledgeEdge, 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - cellW * 1.1, 0);
  ctx.lineTo(cx - cellW * 0.7 + sway, top);
  ctx.moveTo(cx + cellW * 1.1, 0);
  ctx.lineTo(cx + cellW * 0.7 + sway, top);
  ctx.stroke();
  items.forEach(({ img, f }, i) => {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    const inRow = Math.min(perRow, n - r * perRow);
    const x = cx + sway - (inRow * cellW) / 2 + (c + 0.5) * cellW;
    const yb = top + (r + 1) * mh * 1.05;
    const k = Math.min(mh / f[4], (cellW * 1.05) / f[3]);
    ctx.drawImage(img, f[1], f[2], f[3], f[4], x - (f[3] * k) / 2, yb - f[4] * k, f[3] * k, f[4] * k);
  });
  return true;
}

/** Partículas de ambiente sin estado (lluvia, polvo, esporas, ceniza). */
function ambient(ctx: CanvasRenderingContext2D, p: BgParams): void {
  const { w, hgt, t, theme: T } = p;
  const camX = p.dist * p.ppm * 0.6;
  const n = p.overlay ? 18 : 40;
  switch (p.ambient ?? T.ambient) {
    case 'luz': {
      // Calma: motas de luz que suben despacio.
      for (let i = 0; i < n; i++) {
        const x = mod(i * 101.3 - camX * 0.3 + Math.sin(t / 2400 + i) * 14, w);
        const y = mod(i * 67.9 - t * 0.01 * (0.6 + noise(i, 5)), hgt);
        ctx.fillStyle = `rgba(${T.ambientColor},${0.3 + 0.3 * Math.sin(t / 900 + i * 2)})`;
        ctx.fillRect(x, y, 2, 2);
        if (i % 5 === 0) ctx.drawImage(glowSprite('#fff4dc'), x - 7, y - 7, 14, 14);
      }
      break;
    }
    case 'burbujas': {
      // Archivo de los Ahogados: burbujas que suben.
      ctx.strokeStyle = `rgba(${T.ambientColor},0.35)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = mod(i * 83.1 - camX * 0.4 + Math.sin(t / 600 + i) * 4, w);
        const y = mod(i * 59.3 - t * 0.03 * (0.5 + noise(i, 5)), hgt + 10);
        const r = 1 + noise(i, 6) * 2.5;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.stroke();
      break;
    }
    case 'deriva': {
      // Sin gravedad: motas que suben y se desvían.
      ctx.fillStyle = `rgba(${T.ambientColor},0.3)`;
      for (let i = 0; i < n; i++) {
        const x = mod(i * 91.7 - camX * 0.5 + Math.sin(t / 3000 + i) * 20, w);
        const y = mod(i * 47.3 - t * 0.015 * (0.3 + noise(i, 5)), hgt);
        const s = 1.5 + noise(i, 6) * 2;
        ctx.fillRect(x, y, s, s);
      }
      break;
    }
    case 'chispas': {
      // Estática: chispas que se encienden y se apagan.
      ctx.fillStyle = `rgba(${T.ambientColor},0.85)`;
      for (let i = 0; i < n; i++) {
        if (Math.sin(t / 60 + i * 7) < 0.75) continue;
        ctx.fillRect(mod(i * 89.7 - camX * 0.5, w), mod(i * 61.1 + noise(i, 7) * hgt, hgt), 2, 2);
      }
      break;
    }
    case 'pintura': {
      // Puerta Pintada: manchas de pintura que flotan.
      for (let i = 0; i < n / 2; i++) {
        const x = mod(i * 121.7 - camX * 0.4 + Math.sin(t / 2000 + i) * 10, w);
        const y = mod(i * 71.3 - t * 0.008, hgt);
        ctx.fillStyle = rgba(T.lights[i % T.lights.length], 0.35);
        ctx.beginPath();
        ctx.ellipse(x, y, 3 + noise(i, 8) * 4, 2 + noise(i, 9) * 2, i, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'lluvia': {
      ctx.strokeStyle = `rgba(${T.ambientColor},${p.overlay ? 0.22 : 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n * 1.4; i++) {
        const x = mod(i * 97.3 - camX + t * 0.08, w + 20) - 10;
        const y = mod(i * 53.7 + t * 0.55, hgt + 20) - 10;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 11);
      }
      ctx.stroke();
      break;
    }
    case 'esporas': {
      for (let i = 0; i < n; i++) {
        const x = mod(i * 113.1 - camX * 0.7 + Math.sin(t / 1300 + i) * 12, w);
        const y = mod(i * 71.3 - t * 0.012 * (1 + noise(i, 5)), hgt);
        const s = 1 + noise(i, 6) * 1.6;
        ctx.fillStyle = `rgba(${T.ambientColor},${0.35 + 0.35 * Math.sin(t / 700 + i)})`;
        ctx.fillRect(x, y, s, s);
        if (p.dark > 0.3 && i % 4 === 0) ctx.drawImage(glowSprite(T.accent), x - 6, y - 6, 12, 12);
      }
      break;
    }
    case 'polvo': {
      ctx.fillStyle = `rgba(${T.ambientColor},0.28)`;
      for (let i = 0; i < n; i++) {
        const x = mod(i * 89.7 - camX * 0.5 + t * 0.006, w);
        const y = mod(i * 61.1 + Math.sin(t / 2100 + i) * 10 + t * 0.004, hgt);
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      break;
    }
    default: {
      ctx.fillStyle = `rgba(${T.ambientColor},0.25)`;
      for (let i = 0; i < n; i++) {
        ctx.fillRect(mod(i * 89.7 - camX * 0.5, w), mod(i * 61.1 + t * 0.01, hgt), 1.5, 1.5);
      }
    }
  }
}

/** La cornisa por la que corre el Descensor, con el material de su corriente. */
function ledge(ctx: CanvasRenderingContext2D, p: BgParams, art?: SceneryInfo): void {
  const { w, hgt, groundY: gy, ppm, theme: T } = p;
  ctx.globalAlpha = p.overlay ? 0.88 : 1;
  // Los suelos con mecánica visible (espejo, membrana, luz) mandan; el de hueso lo pone el escenario.
  if (p.suelo && !(p.suelo === 'hueso' && art?.strip)) {
    suelo(ctx, p);
    ctx.globalAlpha = 1;
    return;
  }
  if (art?.strip) {
    // El suelo del escenario, a la velocidad del Descensor; debajo, roca que se oscurece.
    const st = art.strip;
    const top = gy - Math.min(st.height * 0.18, 6);
    ctx.fillStyle = T.ledge;
    ctx.fillRect(0, gy, w, hgt - gy);
    tileRow(ctx, st, p.dist * ppm, top, w);
    const below = top + st.height;
    if (below < hgt) {
      const g = ctx.createLinearGradient(0, below - 2, 0, hgt);
      g.addColorStop(0, 'rgba(3,4,9,0.25)');
      g.addColorStop(1, 'rgba(3,4,9,0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(0, below - 2, w, hgt - below + 2);
    }
    ctx.globalAlpha = 1;
    return;
  }
  ctx.fillStyle = T.ledge;
  ctx.fillRect(0, gy, w, hgt - gy);
  ctx.fillStyle = T.ledgeEdge;
  ctx.fillRect(0, gy, w, 2);
  const off = p.dist * ppm;
  const step = 10 * ppm;
  switch (p.corriente) {
    case 'N': {
      // Pasarela metálica: remaches, luces de guía y franjas de peligro.
      ctx.fillStyle = rgba(T.ledgeEdge, 0.8);
      for (let x = -mod(off, step / 2); x < w; x += step / 2) ctx.fillRect(x, gy + 5, 2, 2);
      const big = 60 * ppm;
      for (let x = -mod(off, big); x < w; x += big) {
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = k % 2 ? '#111' : rgba(T.ledgeMark, 0.75);
          ctx.beginPath();
          ctx.moveTo(x + k * 6, gy + 2);
          ctx.lineTo(x + k * 6 + 6, gy + 2);
          ctx.lineTo(x + k * 6 + 2, gy + 9);
          ctx.lineTo(x + k * 6 - 4, gy + 9);
          ctx.fill();
        }
      }
      ctx.fillStyle = rgba(T.accent2, 0.7);
      for (let x = -mod(off, step * 2); x < w; x += step * 2) ctx.fillRect(x, gy - 1, 3, 1);
      break;
    }
    case 'S': {
      // Losa de hormigón con juntas y marcas de seguridad.
      ctx.fillStyle = rgba('#000000', 0.35);
      for (let x = -mod(off, step); x < w; x += step) ctx.fillRect(x, gy + 2, 1, hgt - gy);
      const big = 50 * ppm;
      ctx.fillStyle = rgba(T.ledgeMark, 0.7);
      for (let x = -mod(off, big); x < w; x += big) ctx.fillRect(x, gy + 4, 14, 3);
      break;
    }
    case 'A': {
      // Musgo y matas en el borde; raíces que cuelgan por debajo.
      ctx.fillStyle = rgba(T.accent, 0.35);
      for (let x = -mod(off, step / 3); x < w; x += step / 3) {
        const i = Math.round((x + off) / (step / 3));
        const hh = 2 + noise(i, 7) * 5;
        ctx.beginPath();
        ctx.moveTo(x, gy + 1);
        ctx.lineTo(x + 2, gy - hh);
        ctx.lineTo(x + 4, gy + 1);
        ctx.fill();
      }
      break;
    }
    default: {
      ctx.fillStyle = rgba(T.ledgeEdge, 0.6);
      for (let x = -mod(off, step); x < w; x += step) ctx.fillRect(x, gy + 8, 2, 10);
    }
  }
  ctx.globalAlpha = 1;
}

/** Suelos propios de las sub-capas de Lo Hondo. */
function suelo(ctx: CanvasRenderingContext2D, p: BgParams): void {
  const { w, hgt, groundY: gy, ppm, theme: T, t } = p;
  const off = p.dist * ppm;
  switch (p.suelo) {
    case 'espejo': {
      // Mercurio: un espejo líquido con reflejos que se deslizan (los actores se reflejan encima).
      const g = ctx.createLinearGradient(0, gy, 0, hgt);
      g.addColorStop(0, '#8f9ba8');
      g.addColorStop(0.35, '#3a434d');
      g.addColorStop(1, '#14191e');
      ctx.fillStyle = g;
      ctx.fillRect(0, gy, w, hgt - gy);
      ctx.fillStyle = 'rgba(235,245,250,0.9)';
      ctx.fillRect(0, gy, w, 1.5);
      ctx.fillStyle = 'rgba(235,245,250,0.22)';
      for (let i = 0; i < 9; i++) {
        const x = mod(i * 173 - off * 0.9 + t * 0.02 * ((i % 3) + 1), w + 80) - 40;
        ctx.fillRect(x, gy + 3 + (i % 4) * (hgt - gy) * 0.18, 18 + (i % 5) * 9, 1);
      }
      break;
    }
    case 'membrana': {
      // El Jardín que Respira: piel con venas que se estiran al inspirar.
      const b = p.breath ?? 0;
      ctx.fillStyle = T.ledge;
      ctx.fillRect(0, gy, w, hgt - gy);
      ctx.strokeStyle = rgba(T.ledgeEdge, 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < 2; k++) {
        const y0 = gy + 4 + k * (hgt - gy) * 0.35;
        for (let x = 0; x <= w; x += 12) {
          const y = y0 + Math.sin((x + off) * 0.03 + k * 2) * (1.5 + 3.5 * b);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.fillStyle = rgba(T.ledgeEdge, 0.85);
      ctx.fillRect(0, gy - 1 - b * 2, w, 2 + b * 2);
      break;
    }
    case 'hueso': {
      // Los Huesos del Gigante: hueso con nudillos cada 30 m.
      ctx.fillStyle = T.ledge;
      ctx.fillRect(0, gy, w, hgt - gy);
      ctx.fillStyle = T.ledgeEdge;
      ctx.fillRect(0, gy, w, 2);
      const step = 30 * ppm;
      for (let x = -mod(off, step); x < w; x += step) {
        ctx.fillStyle = 'rgba(42,32,24,0.5)';
        ctx.fillRect(x, gy + 2, 3, hgt - gy);
        ctx.fillStyle = rgba(T.ledgeEdge, 0.55);
        ctx.beginPath();
        ctx.arc(x + 1.5, gy + 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'luz': {
      // El Fondo: el suelo brilla desde dentro.
      ctx.fillStyle = T.ledge;
      ctx.fillRect(0, gy, w, hgt - gy);
      const g = ctx.createLinearGradient(0, gy, 0, gy + 12);
      g.addColorStop(0, 'rgba(255,250,235,0.4)');
      g.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, gy, w, 12);
      ctx.fillStyle = 'rgba(255,250,235,0.9)';
      ctx.fillRect(0, gy, w, 1.5);
      break;
    }
  }
}
