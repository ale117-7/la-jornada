// Arte de sprites: atlas WebP generados por `scripts/arte/empaquetar.py` a partir de IMAGENES/.
// Las páginas se cargan bajo demanda; mientras no han llegado, `drawArt` devuelve false y el
// renderer dibuja la forma de respaldo. Todo es sin estado salvo las cachés de imágenes y tintes.
import MANIFEST from './manifest.json';

/** [página, x, y, w, h, anclaX, anclaY] en píxeles del atlas. */
export type Frame = [number, number, number, number, number, number, number];
interface Sheet {
  nombre: string;
  pages: string[];
  /** Tamaño de cada página en píxeles. */
  sizes: [number, number][];
  rows: Record<string, Frame[]>;
}
const SHEETS = MANIFEST as unknown as Record<string, Sheet>;

/** Cuadro de una hoja: fila (número o 'banda'/'suelo'/'pieza') y columna (desde 1). */
export type Ref = [row: number | string, col: number];

const images = new Map<string, HTMLImageElement>();
const failed = new Set<string>();

function pageImage(src: string): HTMLImageElement | null {
  if (failed.has(src)) return null;
  let im = images.get(src);
  if (!im) {
    if (typeof Image === 'undefined') return null;
    im = new Image();
    im.decoding = 'async';
    im.onerror = () => failed.add(src);
    im.src = src;
    images.set(src, im);
  }
  return im.complete && im.naturalWidth > 0 ? im : null;
}

export function hasSheet(id: string): boolean {
  return !!SHEETS[id];
}

/** Número de cuadros de una fila. */
export function rowLength(sheet: string, row: number | string): number {
  return SHEETS[sheet]?.rows[String(row)]?.length ?? 0;
}

export function frameOf(sheet: string, ref: Ref): Frame | null {
  return SHEETS[sheet]?.rows[String(ref[0])]?.[ref[1] - 1] ?? null;
}

/** Imagen y cuadro listos para dibujar (o null si la página aún no ha cargado). */
export function resolve(sheet: string, ref: Ref): { img: HTMLImageElement; f: Frame } | null {
  const s = SHEETS[sheet];
  const f = s?.rows[String(ref[0])]?.[ref[1] - 1];
  if (!f) return null;
  const img = pageImage(s.pages[f[0]]);
  return img ? { img, f } : null;
}

/** Pide por adelantado las páginas de una hoja (para que no parpadee la forma de respaldo). */
export function preload(sheet: string): boolean {
  const s = SHEETS[sheet];
  if (!s) return false;
  let ok = true;
  for (const p of s.pages) if (!pageImage(p)) ok = false;
  return ok;
}

// ---------- tintes (destello de daño, híbridos, aspectos de sub-capa) ----------

const OUTLINE_DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const tints = new Map<string, HTMLCanvasElement>();
function tinted(img: HTMLImageElement, f: Frame, color: string): HTMLCanvasElement {
  const key = `${img.src}|${f[1]},${f[2]}|${color}`;
  let c = tints.get(key);
  if (c) return c;
  if (tints.size > 600) tints.clear();
  c = document.createElement('canvas');
  c.width = f[3];
  c.height = f[4];
  const x = c.getContext('2d')!;
  x.drawImage(img, f[1], f[2], f[3], f[4], 0, 0, f[3], f[4]);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = color;
  x.fillRect(0, 0, f[3], f[4]);
  tints.set(key, c);
  return c;
}

export interface DrawOpts {
  /** Espejar en horizontal (respecto al punto de anclaje). */
  flip?: boolean;
  alpha?: number;
  /** Capa de color encima (0–1), p. ej. destello blanco de daño o el de un híbrido. */
  tint?: { color: string; k: number };
  /** Segunda capa de color (p. ej. el híbrido además del destello). */
  tint2?: { color: string; k: number };
  /** Rotación en radianes alrededor del punto de anclaje. */
  rot?: number;
  /** Contorno de color (px de pantalla) para que la silueta se lea sobre cualquier fondo. */
  outline?: { color: string; px: number; alpha?: number };
}

/**
 * Dibuja un cuadro con su ancla en (x, y). `scale` = píxeles de pantalla por píxel del atlas.
 * Devuelve false si aún no ha cargado.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, sheet: string, ref: Ref, x: number, y: number, scale: number, o: DrawOpts = {}): boolean {
  const r = resolve(sheet, ref);
  if (!r) return false;
  const { img, f } = r;
  const w = f[3] * scale;
  const h = f[4] * scale;
  const dx = -f[5] * scale;
  const dy = -f[6] * scale;
  const a0 = ctx.globalAlpha;
  const transformed = o.flip || o.rot;
  if (transformed) {
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
  }
  const px = transformed ? dx : x + dx;
  const py = transformed ? dy : y + dy;
  if (o.outline && o.outline.px > 0) {
    const ol = tinted(img, f, o.outline.color);
    const d = o.outline.px;
    ctx.globalAlpha = a0 * (o.alpha ?? 1) * (o.outline.alpha ?? 1);
    for (const [ox, oy] of OUTLINE_DIRS) ctx.drawImage(ol, px + ox * d, py + oy * d, w, h);
  }
  ctx.globalAlpha = a0 * (o.alpha ?? 1);
  ctx.drawImage(img, f[1], f[2], f[3], f[4], px, py, w, h);
  for (const t of [o.tint2, o.tint]) {
    if (t && t.k > 0.01) {
      ctx.globalAlpha = a0 * (o.alpha ?? 1) * Math.min(1, t.k);
      ctx.drawImage(tinted(img, f, t.color), px, py, w, h);
    }
  }
  ctx.globalAlpha = a0;
  if (transformed) ctx.restore();
  return true;
}

/** Tamaño de un cuadro en píxeles del atlas. */
export function frameSize(sheet: string, ref: Ref): [number, number] {
  const f = frameOf(sheet, ref);
  return f ? [f[3], f[4]] : [0, 0];
}

// ---------- animaciones ----------

export interface Anim {
  frames: Ref[];
  /** Cuadros por segundo. */
  fps: number;
  /** false: se queda en el último cuadro. */
  loop?: boolean;
}

/** Definición de arte de una entidad. */
export interface ArtDef {
  sheet: string;
  /** Cuadro cuya altura es la de referencia (normalmente el primero del reposo). */
  ref: Ref;
  /** Altura en unidades `u` del juego que mide el cuadro de referencia en pantalla. */
  h: number;
  /** El dibujo original mira a la izquierda (criaturas y jefes). */
  left?: boolean;
  anims: Partial<Record<AnimName, Anim>>;
  /** Retrato para avisos y carteles. */
  portrait?: Ref;
}
export type AnimName = 'idle' | 'run' | 'attack' | 'hurt' | 'death' | 'respawn' | 'evolved' | 'mid' | 'broken';

export const A = (frames: Ref[], fps = 8, loop = true): Anim => ({ frames, fps, loop });
/** Fila completa o tramo de columnas de una fila. */
export const row = (r: number | string, from = 1, to?: number, sheet?: string): Ref[] => {
  const n = to ?? (sheet ? (SHEETS[sheet]?.rows[String(r)]?.length ?? from) : from);
  const out: Ref[] = [];
  for (let c = from; c <= n; c++) out.push([r, c]);
  return out;
};

/** Cuadro de una animación en el instante t (ms). Con `loop: false`, t cuenta desde el inicio. */
export function animFrame(a: Anim, t: number): Ref {
  const i = Math.floor((t / 1000) * a.fps);
  const n = a.frames.length;
  return a.frames[a.loop === false ? Math.min(n - 1, Math.max(0, i)) : ((i % n) + n) % n];
}

export function animDuration(a: Anim): number {
  return (a.frames.length / a.fps) * 1000;
}

/** Escala (px de pantalla por px de atlas) para que el cuadro de referencia mida `h·u`. */
export function scaleFor(d: ArtDef, u: number): number {
  const f = frameOf(d.sheet, d.ref);
  return f ? (d.h * u) / f[4] : 0;
}

/**
 * Dibuja la entidad con la animación pedida (o el reposo si no la tiene) en el instante t.
 * `faceLeft`: hacia dónde debe mirar en pantalla.
 */
export function drawArt(ctx: CanvasRenderingContext2D, d: ArtDef | undefined, anim: AnimName, t: number, x: number, y: number, u: number, faceLeft: boolean, o: DrawOpts = {}): boolean {
  if (!d) return false;
  const a = d.anims[anim] ?? d.anims.idle;
  if (!a) return false;
  const s = scaleFor(d, u);
  if (!s) return false;
  return drawFrame(ctx, d.sheet, animFrame(a, t), x, y, s, { ...o, flip: (o.flip ?? false) !== (!!d.left !== faceLeft) });
}

// ---------- DOM: un cuadro como <span> con fondo del atlas ----------

/** HTML de un cuadro a un alto dado (px), para los paneles. Cadena vacía si no existe. */
export function spriteHtml(sheet: string, ref: Ref, size: number, title = ''): string {
  const s = SHEETS[sheet];
  const f = frameOf(sheet, ref);
  if (!s || !f) return '';
  const k = size / Math.max(f[3], f[4]);
  const src = s.pages[f[0]];
  pageImage(src);
  const [pw, ph] = s.sizes[f[0]] ?? [f[1] + f[3], f[2] + f[4]];
  const t = title ? ` title="${title.replace(/"/g, '&quot;')}"` : '';
  return `<span class="spr"${t} style="width:${Math.round(f[3] * k)}px;height:${Math.round(f[4] * k)}px;background-image:url('${src}');background-position:${(-f[1] * k).toFixed(1)}px ${(-f[2] * k).toFixed(1)}px;background-size:${(pw * k).toFixed(1)}px ${(ph * k).toFixed(1)}px"></span>`;
}
