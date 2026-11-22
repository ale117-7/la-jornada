// Paletas por corriente (sección 2.1 del diseño). Cuanto más hondo, más oscuro: la luz pasa a
// venir de la bioluminiscencia y del neón. Placeholder hasta el arte final.
import type { Corriente } from '../data/tags';

export type Ambient = 'lluvia' | 'polvo' | 'esporas' | 'ceniza' | 'luz' | 'burbujas' | 'deriva' | 'chispas' | 'pintura';

export interface Theme {
  skyTop: string;
  skyBottom: string;
  /** Siluetas: lejos, medio, cerca. */
  far: string;
  mid: string;
  near: string;
  ledge: string;
  ledgeEdge: string;
  ledgeMark: string;
  /** Color de la corriente. */
  accent: string;
  /** Segundo color (señalética, ventanas, flores). */
  accent2: string;
  /** Luces pequeñas del fondo (ventanas, bioluminiscencia). */
  lights: string[];
  /** Haces de luz desde arriba: "r,g,b". */
  shaft: string;
  ambient: Ambient;
  ambientColor: string;
}

const BASE: Record<Corriente | 'X', Theme> = {
  // Neón: ciudad vertical podrida, lluvia, publicidad holográfica.
  N: {
    skyTop: '#151a3a', skyBottom: '#05060d',
    far: '#10142c', mid: '#171c3a', near: '#20264a',
    ledge: '#1c1f33', ledgeEdge: '#3a3f66', ledgeMark: '#ffb347',
    accent: '#ff3fa4', accent2: '#3fe0e6',
    lights: ['#ff3fa4', '#3fe0e6', '#ffb347', '#ffd27a'],
    shaft: '255,120,200', ambient: 'lluvia', ambientColor: '160,190,255',
  },
  // Sintética: megaestructuras impecables, señalética gigante, silencio.
  S: {
    skyTop: '#2a2c2e', skyBottom: '#0b0c0d',
    far: '#26292b', mid: '#303437', near: '#3c4145',
    ledge: '#2e3236', ledgeEdge: '#8a9196', ledgeMark: '#ff7a1a',
    accent: '#b6ff3f', accent2: '#ff7a1a',
    lights: ['#b6ff3f', '#e8e6df', '#ff7a1a'],
    shaft: '235,232,220', ambient: 'polvo', ambientColor: '230,228,220',
  },
  // Abismal: bosques que crecen hacia abajo, esporas de luz, belleza que mata.
  A: {
    skyTop: '#0f2a28', skyBottom: '#030a09',
    far: '#0d221f', mid: '#123029', near: '#173a31',
    ledge: '#1a2b22', ledgeEdge: '#3f6b4f', ledgeMark: '#d8c27a',
    accent: '#3fe0b0', accent2: '#d8c27a',
    lights: ['#3fe0b0', '#d8c27a', '#9f7aff'],
    shaft: '230,210,140', ambient: 'esporas', ambientColor: '120,255,200',
  },
  // Antes de elegir el Origen.
  X: {
    skyTop: '#121a30', skyBottom: '#030409',
    far: '#0c1322', mid: '#111a2d', near: '#17223a',
    ledge: '#1b2233', ledgeEdge: '#2b3550', ledgeMark: '#3fe0e6',
    accent: '#3fe0e6', accent2: '#ffb347',
    lights: ['#3fe0e6'],
    shaft: '160,200,255', ambient: 'ceniza', ambientColor: '180,190,210',
  },
};

function hex(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
const toHex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** Mezcla dos colores (#rrggbb). */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

/** Color con transparencia, a partir de #rrggbb. */
export function rgba(h: string, a: number): string {
  const [r, g, b] = hex(h);
  return `rgba(${r},${g},${b},${a})`;
}

const cache = new Map<string, Theme>();

/**
 * Paleta para la corriente y la profundidad. `dark` (0–1) oscurece fondo y paredes; las luces
 * (acentos, ventanas, bioluminiscencia) se mantienen y pasan a ser lo que más se ve.
 */
export function themeFor(c: Corriente | null, dark: number): Theme {
  const d = Math.round(Math.min(1, Math.max(0, dark)) * 20) / 20;
  const key = `${c ?? 'X'}:${d}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const b = BASE[c ?? 'X'];
  const k = d * 0.72;
  const black = '#000000';
  const t: Theme = {
    ...b,
    skyTop: mix(b.skyTop, black, k),
    skyBottom: mix(b.skyBottom, black, k * 0.6),
    far: mix(b.far, black, k * 0.8),
    mid: mix(b.mid, black, k * 0.75),
    near: mix(b.near, black, k * 0.65),
    ledge: mix(b.ledge, black, k * 0.55),
    ledgeEdge: mix(b.ledgeEdge, black, k * 0.4),
  };
  cache.set(key, t);
  return t;
}

// ---------- variantes: paletas propias de sub-capas y escenas ----------

/** Paleta de una sub-capa de Lo Hondo o de una escena (Puerta Pintada). */
export type ThemeVariant = 'mercurio' | 'estatica' | 'organico' | 'vacio' | 'ahogado' | 'fabrica' | 'hueso' | 'antiguo' | 'latido' | 'ruido' | 'calma' | 'pintada';

interface VariantDef {
  /** Color hacia el que se tiñen las siluetas, y cuánto. */
  tint: string;
  k: number;
  sky?: [string, string];
  lights?: string[];
  accent?: string;
  accent2?: string;
  shaft?: string;
  ambientColor?: string;
  ledge?: string;
  ledgeEdge?: string;
  ledgeMark?: string;
}

const VARIANTS: Record<ThemeVariant, VariantDef> = {
  mercurio: { tint: '#5b6773', k: 0.35, sky: ['#141a22', '#05070a'], lights: ['#e6f0f6', '#9fb4c4', '#3fe0e6'], accent: '#cfe3ee', accent2: '#3fe0e6', shaft: '220,235,245', ledgeEdge: '#e6f0f6' },
  estatica: { tint: '#1c2348', k: 0.4, sky: ['#0d1026', '#030409'], lights: ['#9fd8ff', '#e8f6ff', '#b48cff'], accent: '#9fd8ff', accent2: '#b48cff', shaft: '170,210,255', ambientColor: '200,230,255' },
  organico: { tint: '#4a1a2a', k: 0.4, sky: ['#1f0a12', '#070204'], lights: ['#ff9ab0', '#ffd0d8', '#3fe0b0'], accent: '#ff9ab0', accent2: '#3fe0b0', shaft: '255,170,190', ledge: '#3a1622', ledgeEdge: '#c4607a' },
  vacio: { tint: '#0e1630', k: 0.45, sky: ['#070b1c', '#010204'], lights: ['#cfe0ff', '#ffffff', '#9f7aff'], accent: '#cfe0ff', accent2: '#9f7aff', shaft: '200,215,255', ambientColor: '210,220,255' },
  ahogado: { tint: '#0f3a44', k: 0.45, sky: ['#0a2830', '#020a0d'], lights: ['#9fe6ff', '#e8fbff', '#3fe0b0'], accent: '#9fe6ff', accent2: '#e8fbff', shaft: '160,230,255', ambientColor: '200,240,255' },
  fabrica: { tint: '#2d2f33', k: 0.3, lights: ['#ff3fa4', '#3fe0e6', '#b6ff3f', '#3fe0b0', '#ffb347'], accent: '#ffb347', accent2: '#3fe0e6', shaft: '255,210,150' },
  hueso: { tint: '#3a3026', k: 0.4, sky: ['#1a140f', '#060403'], lights: ['#e8dcc0', '#ffb347'], accent: '#e8dcc0', accent2: '#ffb347', shaft: '240,225,190', ledge: '#6d6250', ledgeEdge: '#d9cfb8', ledgeMark: '#8a7c62' },
  antiguo: { tint: '#6b5638', k: 0.55, sky: ['#3a2e20', '#120d08'], lights: ['#f3dca0', '#e9c27a', '#d9a75a'], accent: '#e0b872', accent2: '#c8a06a', shaft: '245,215,160', ambientColor: '235,215,175', ledge: '#3b3226', ledgeEdge: '#8a7656', ledgeMark: '#d9b26a' },
  latido: { tint: '#4a0a16', k: 0.45, sky: ['#26050c', '#080102'], lights: ['#ff4d5e', '#ff8a8a', '#ffb347'], accent: '#ff4d5e', accent2: '#ff8a8a', shaft: '255,90,110' },
  ruido: { tint: '#24103a', k: 0.45, sky: ['#120a20', '#040208'], lights: ['#ff3fa4', '#3fe0e6', '#ffffff'], accent: '#ff3fa4', accent2: '#3fe0e6', shaft: '200,120,255', ambientColor: '255,120,220' },
  calma: { tint: '#5d7a92', k: 0.5, sky: ['#1d2a3a', '#3d5468'], lights: ['#ffffff', '#e8f4ff', '#ffe9b0'], accent: '#eaf6ff', accent2: '#ffe9b0', shaft: '255,250,235', ambientColor: '255,250,230', ledge: '#2c3a48', ledgeEdge: '#cfe6f5' },
  pintada: { tint: '#4a2c6a', k: 0.6, sky: ['#2b1840', '#120a1e'], lights: ['#ffd36b', '#ff8ad8', '#7ef0ff'], accent: '#ffd36b', accent2: '#ff8ad8', shaft: '255,200,240', ambientColor: '255,210,240', ledge: '#3a2450', ledgeEdge: '#ffd36b', ledgeMark: '#ff8ad8' },
};

const vcache = new WeakMap<Theme, Map<ThemeVariant, Theme>>();

/** La paleta `t` llevada a una variante (con caché: no se recalcula en cada frame). */
export function variantTheme(t: Theme, v: ThemeVariant | null | undefined): Theme {
  if (!v) return t;
  let m = vcache.get(t);
  if (!m) vcache.set(t, (m = new Map()));
  const hit = m.get(v);
  if (hit) return hit;
  const d = VARIANTS[v];
  const r: Theme = {
    ...t,
    skyTop: d.sky ? d.sky[0] : mix(t.skyTop, d.tint, d.k),
    skyBottom: d.sky ? d.sky[1] : mix(t.skyBottom, d.tint, d.k * 0.5),
    far: mix(t.far, d.tint, d.k),
    mid: mix(t.mid, d.tint, d.k),
    near: mix(t.near, d.tint, d.k),
    ledge: d.ledge ?? mix(t.ledge, d.tint, d.k),
    ledgeEdge: d.ledgeEdge ?? t.ledgeEdge,
    ledgeMark: d.ledgeMark ?? t.ledgeMark,
    accent: d.accent ?? t.accent,
    accent2: d.accent2 ?? t.accent2,
    lights: d.lights ?? t.lights,
    shaft: d.shaft ?? t.shaft,
    ambientColor: d.ambientColor ?? t.ambientColor,
  };
  m.set(v, r);
  return r;
}
