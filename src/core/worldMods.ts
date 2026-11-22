// Lectura (sin efectos secundarios) del estado del mundo: condición del día, mecánicas de
// sub-capa, Presión y los modificadores que todo ello aporta a la build.
import { COMBO_BY_ID } from '../data/combos';
import { CONDITION_BY_ID, type DayConditionDef } from '../data/dayConditions';
import { DESTINY_BY_ID } from '../data/destiny';
import { zoneInfo } from '../data/eras';
import { MUTATION_BY_ID } from '../data/mutations';
import { MECHANIC_BY_ID, RECUERDOS_CADA } from '../data/route';
import type { Efectos } from './mods';
import type { DayState } from './types';

export const conditionOf = (s: DayState): DayConditionDef => CONDITION_BY_ID[s.world.condicion] ?? CONDITION_BY_ID.normal;

export const hasMechanic = (s: DayState, id: string): boolean => s.world.sub?.mecanicas.includes(id) ?? false;

/** Presión del tramo antes de modificadores: aparece en la Era II y sube con la profundidad. */
const PRESION_ERA = [0, 8, 20, 34, 46];
export function presionBase(s: DayState): number {
  if (s.era === 0) return 0;
  const inEra = zoneInfo(s.zone).inEra;
  return PRESION_ERA[s.era] + Math.min(18, inEra * 0.5);
}
/** Fracción máxima de ataque y vida que quita la Presión (a 100 puntos). */
export const PRESION_MAX_EFECTO = 0.25;

/** Fase de la mecánica Respiración: 0 = expansión (rápida), 1 = contracción (lenta). */
export const breathPhase = (s: DayState) => Math.floor(s.workedMs / 30_000) % 2;

/** Efectos que aporta el mundo: condición, sucesos, mutaciones, mecánicas, combos y cartas de Destino. */
export function worldEfectos(s: DayState): Efectos[] {
  const w = s.world;
  const out: Efectos[] = [];
  const cond = conditionOf(s);
  if (cond.efectos) out.push(cond.efectos);
  for (const b of w.buffs) out.push(b.efectos);
  out.push(...w.permanentes);
  for (const id of w.mutaciones) out.push(MUTATION_BY_ID[id].efectos);
  for (const id of w.combos) out.push(COMBO_BY_ID[id].efectos);
  for (const id of s.build.destinos) {
    const d = DESTINY_BY_ID[id];
    if (d.efectos) out.push(d.efectos);
  }
  for (const id of w.sub?.mecanicas ?? []) {
    const m = MECHANIC_BY_ID[id];
    if (m.efectos) out.push(m.efectos);
    if (id === 'respiracion') out.push({ velocidadMult: breathPhase(s) === 0 ? 1.5 : 0.75 });
  }
  return out;
}

// ---------- mecánicas con ritmo propio ----------
// La simulación detallada (tick) las aplica golpe a golpe; la rápida (por encuentros) usa su
// media, que rinde exactamente lo mismo.

/** Carga (Catedral de Estática): cada `cada` golpes estalla la electricidad acumulada (×mult). */
export const CARGA = { cada: 10, mult: 5 };
/** Pulso (El Latido): cada `cadaMs` llega un latido; durante `durMs` el daño se multiplica. */
export const PULSO = { cadaMs: 10_000, durMs: 2_000, mult: 2.25 };
const PULSO_MEDIO = 1 + ((PULSO.mult - 1) * PULSO.durMs) / PULSO.cadaMs; // ×1,25
const CARGA_MEDIA = 1 + (CARGA.mult - 1) / CARGA.cada; // ×1,4

export const pulsoActivo = (workedMs: number) => workedMs % PULSO.cadaMs < PULSO.durMs;

/** Multiplicador de un golpe concreto del Descensor (el nº `hits`, ya contado). */
export function golpeMundo(s: DayState, hits: number): number {
  let k = 1;
  if (hasMechanic(s, 'carga') && hits % CARGA.cada === 0) k *= CARGA.mult;
  if (hasMechanic(s, 'pulso') && pulsoActivo(s.workedMs)) k *= PULSO.mult;
  return k;
}
/** Multiplicador del daño continuo (veneno): solo el latido. */
export const continuoMundo = (s: DayState) => (hasMechanic(s, 'pulso') && pulsoActivo(s.workedMs) ? PULSO.mult : 1);
/** Medias para la simulación rápida. */
export const golpeMundoMedio = (s: DayState) => (hasMechanic(s, 'carga') ? CARGA_MEDIA : 1) * (hasMechanic(s, 'pulso') ? PULSO_MEDIO : 1);
export const continuoMundoMedio = (s: DayState) => (hasMechanic(s, 'pulso') ? PULSO_MEDIO : 1);

/** Estado legible de una mecánica en este instante (panel «Hoy»), o null si no hay nada que contar. */
export function mechanicStatus(s: DayState, id: string): string | null {
  const t = s.workedMs;
  switch (id) {
    case 'carga':
      return `Carga ${s.hero.hits % CARGA.cada}/${CARGA.cada}: al completarse, el golpe hace ×${CARGA.mult}.`;
    case 'respiracion':
      return `${breathPhase(s) === 0 ? 'Se expande: se corre a ×1,5' : 'Se contrae: se corre a ×0,75'} (cambia en ${Math.ceil((30_000 - (t % 30_000)) / 1000)} s).`;
    case 'pulso':
      return pulsoActivo(t) ? `¡Latido! Daño ×${String(PULSO.mult).replace('.', ',')} durante 2 s.` : `Próximo latido en ${Math.ceil((PULSO.cadaMs - (t % PULSO.cadaMs)) / 1000)} s.`;
    case 'recuerdos':
      return `Recuerdos: ${s.world.recuerdos} (el siguiente fragmento, en ${RECUERDOS_CADA - (s.world.recuerdos % RECUERDOS_CADA)} bajas).`;
    case 'escalada': {
      const n = (9 - (s.zone % 5)) % 5;
      return n === 0 ? 'Una costilla cierra este tramo.' : `Próxima costilla en ${n} tramo${n > 1 ? 's' : ''}.`;
    }
    case 'calma': {
      const left = (s.world.sub?.hora ?? 0) * 3_600_000 + 300_000 - t;
      return left > 0 ? `Silencio: las criaturas vuelven en ${Math.ceil(left / 60_000)} min.` : 'La calma se ha roto.';
    }
    default:
      return null;
  }
}
