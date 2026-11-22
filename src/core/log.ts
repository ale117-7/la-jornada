import { BAL } from '../data/balance';
import type { DayState } from './types';

export function pushLog(s: DayState, text: string): void {
  s.eventLog.push({ t: Math.round(s.workedMs), text });
  if (s.eventLog.length > BAL.LOG_MAX) s.eventLog.splice(0, s.eventLog.length - BAL.LOG_MAX);
}

/** Hito de la jornada: queda en la línea de tiempo (simulador, Crónica) y en el registro. */
export function pushHito(s: DayState, id: string, text: string): void {
  if (!s.hitos.some((h) => h.id === id)) {
    s.hitos.push({ id, t: Math.round(s.workedMs), text });
    novedad(s);
  }
  pushLog(s, text);
}

/**
 * Registra "algo nuevo" (evento, criatura nueva, edificio, carta, sinergia…) y mide el mayor
 * hueco sin novedades del día. Las criaturas se cuentan también aparte.
 */
export function novedad(s: DayState, criatura = false): void {
  const n = s.world.novedad;
  const t = s.workedMs;
  const hora = Math.floor(t / 3_600_000);
  if (t - n.lastMs > n.maxGapMs) {
    n.maxGapMs = t - n.lastMs;
    n.maxGapAtMs = n.lastMs;
  }
  n.lastMs = t;
  if (criatura) n.criaturasPorHora[hora] = (n.criaturasPorHora[hora] ?? 0) + 1;
  else {
    if (t - n.lastOtrasMs > n.maxGapOtrasMs) n.maxGapOtrasMs = t - n.lastOtrasMs;
    n.lastOtrasMs = t;
    n.porHora[hora] = (n.porHora[hora] ?? 0) + 1;
  }
}
