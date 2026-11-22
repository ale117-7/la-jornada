// Las 5 eras (capas del abismo). Una era termina al derrotar a su Umbral de era; la siguiente
// empieza cuando además se alcanza su umbral de tiempo trabajado.
import type { Corriente } from './tags';

export interface EraDef {
  romano: string;
  capa: string;
  /** Tiempo trabajado mínimo para entrar en la era. */
  thresholdMs: number;
  /** Tramos de la era (Infinity en Lo Hondo). El último tiene el Umbral de era. */
  zones: number;
  depthStart: number;
  /** Metros que baja cada tramo. */
  depthPerZone: number;
  /** Multiplicadores de era sobre las criaturas (multEra de la sección 8). */
  multHp: number;
  multAtk: number;
  oroMult: number;
  /**
   * Hondura: crecimiento extra por cada tramo dentro de la era (se multiplica al de la sección 8).
   * Lo Hondo no tiene puertas de tiempo, así que cada tramo pesa más: el héroe llega pronto a su
   * límite. Es una exponencial suavizada: fuerte en los primeros `tramos` y más suave después.
   */
  hondura?: { tramos: number; hp: [number, number]; atk: [number, number] };
  /** Umbral (jefe) que cierra la era, con un nombre por corriente. */
  jefe: { nombre: string; variantes: Record<Corriente, string>; hpMult: number; atkMult: number };
}

const H = 3_600_000;

export const ERAS: EraDef[] = [
  {
    romano: 'I', capa: 'El Brocal', thresholdMs: 0, zones: 20, depthStart: 0, depthPerZone: 50,
    multHp: 1, multAtk: 1, oroMult: 1,
    jefe: { nombre: 'El Portero', variantes: { N: 'Grúa de Seguridad', S: 'Torre de Medición', A: 'Garza Anciana' }, hpMult: 36, atkMult: 2.6 },
  },
  {
    romano: 'II', capa: 'Los Andamios', thresholdMs: 1 * H, zones: 14, depthStart: 1000, depthPerZone: 2500 / 14,
    multHp: 1, multAtk: 1, oroMult: 1.6,
    jefe: { nombre: 'La Grúa Viva', variantes: { N: 'Excavadora Poseída', S: 'Andamio Consciente', A: 'Nido-Madre' }, hpMult: 190, atkMult: 6 },
  },
  {
    romano: 'III', capa: 'El Bosque Invertido', thresholdMs: 2 * H, zones: 29, depthStart: 3500, depthPerZone: 4500 / 29,
    multHp: 1, multAtk: 1, oroMult: 2.6,
    jefe: { nombre: 'El Corazón del Bosque', variantes: { N: 'Servidor Raíz', S: 'Prisma Madre', A: 'Árbol Madre' }, hpMult: 3800, atkMult: 25 },
  },
  {
    romano: 'IV', capa: 'La Necrópolis', thresholdMs: 3.5 * H, zones: 24, depthStart: 8000, depthPerZone: 7000 / 24,
    multHp: 1, multAtk: 1, oroMult: 4.5,
    jefe: { nombre: 'El Guardián', variantes: { N: 'CEO Fantasma en su exoesqueleto', S: 'Arquitecto Final', A: 'Coloso Fosilizado' }, hpMult: 900, atkMult: 14 },
  },
  {
    romano: 'V', capa: 'Lo Hondo', thresholdMs: 5 * H, zones: Infinity, depthStart: 15000, depthPerZone: 400,
    multHp: 90, multAtk: 80, oroMult: 8,
    hondura: { tramos: 40, hp: [1.1, 1.04], atk: [1.14, 1.03] },
    jefe: { nombre: 'Umbral de Lo Hondo', variantes: { N: 'Eco de Neón', S: 'Eco Sintético', A: 'Eco Abismal' }, hpMult: 12, atkMult: 1.8 },
  },
];

/** Variantes de cada capa según la corriente activa (12 = 4 capas × 3 corrientes). */
export const LAYER_VARIANTS: Record<Corriente, string>[] = [
  { N: 'Muelles de carga y mercado negro en el borde', S: 'Plataformas de medición abandonadas', A: 'Primeros jardines colgantes del borde' },
  { N: 'Favelas verticales y fábricas que gotean', S: 'Andamios de una construcción infinita', A: 'Nidos de aves en acantilados de niebla' },
  { N: 'Bosque invadido por cables y granjas de datos', S: 'Árboles de cristal clonados en serie', A: 'Árboles gigantes que crecen hacia abajo' },
  { N: 'Ciudad corporativa hundida, todavía encendida', S: 'Ciudad antigua perfecta, sin habitantes y vigilada', A: 'Ruinas fosilizadas de una civilización tragada' },
];

/** Cada cuántos tramos hay un Umbral menor dentro de una era. */
export const UMBRAL_CADA = 10;
/** Un Umbral menor no aparece si el de era está a menos de estos tramos. */
const UMBRAL_MARGEN = 4;
export const UMBRAL_MENOR = { hpMult: 5, atkMult: 1.3 };

const STARTS: number[] = [];
ERAS.reduce((acc, e) => {
  STARTS.push(acc);
  return acc + e.zones;
}, 0);

export const eraStartZone = (era: number) => STARTS[era];

export function eraOfZone(zone: number): number {
  let i = 0;
  while (i < ERAS.length - 1 && zone >= STARTS[i + 1]) i++;
  return i;
}

/** Multiplicadores de era de un tramo (incluida la Hondura acumulada dentro de la era). */
export function eraScale(zone: number): { hp: number; atk: number; oro: number } {
  const era = eraOfZone(zone);
  const e = ERAS[era];
  const n = zone - STARTS[era];
  const h = e.hondura;
  const a = h ? Math.min(n, h.tramos) : 0;
  const b = h ? Math.max(0, n - h.tramos) : 0;
  return {
    hp: e.multHp * (h ? Math.pow(h.hp[0], a) * Math.pow(h.hp[1], b) : 1),
    atk: e.multAtk * (h ? Math.pow(h.atk[0], a) * Math.pow(h.atk[1], b) : 1),
    oro: e.oroMult,
  };
}

export interface ZoneInfo {
  era: number;
  /** Tramo dentro de la era (0-based). */
  inEra: number;
  /** Último tramo de la era: tiene el Umbral de era. */
  eraEnd: boolean;
  /** Tiene Umbral (menor o de era). */
  umbral: boolean;
}

export function zoneInfo(zone: number): ZoneInfo {
  const era = eraOfZone(zone);
  const inEra = zone - STARTS[era];
  const zones = ERAS[era].zones;
  const eraEnd = inEra === zones - 1;
  const minor = (inEra + 1) % UMBRAL_CADA === 0 && inEra < zones - 1 - UMBRAL_MARGEN;
  return { era, inEra, eraEnd, umbral: eraEnd || minor };
}

export function depthAt(zone: number, xFraction: number): number {
  const era = eraOfZone(zone);
  const e = ERAS[era];
  return e.depthStart + (zone - STARTS[era] + xFraction) * e.depthPerZone;
}
