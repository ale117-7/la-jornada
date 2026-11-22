// Crónica: lectura del historial (sin efecto en el juego). Racha, récords y datos del gráfico.
import { depthMeters } from './sim';
import type { ChronicleEntry, SaveData } from './types';

export interface ChronicleDay {
  dateKey: string;
  workedMs: number;
  /** Jornada en curso (aún no archivada). */
  hoy: boolean;
  entry: ChronicleEntry | null;
}

export interface ChronicleStats {
  /** Últimos días del calendario (incluye los días sin trabajar, con 0), el más reciente al final. */
  dias: ChronicleDay[];
  /** Días seguidos con trabajo, contando hoy si ya se trabajó (o hasta ayer si aún no). */
  racha: number;
  mejorRacha: number;
  diasJugados: number;
  totalMs: number;
  records: { horasMs: number; horasDia: string; tramo: number; tramoDia: string; profundidad: number; era: number };
}

const DAY = 86_400_000;
const toMs = (key: string) => Date.parse(`${key}T12:00:00`);
const toKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function chronicleStats(save: SaveData, span = 30): ChronicleStats {
  const cur = save.current;
  const byKey = new Map<string, ChronicleDay>();
  // Si un día se archivó más de una vez (reinicios de debug), cuenta el de más tiempo trabajado.
  for (const e of save.chronicle) {
    const prev = byKey.get(e.dateKey);
    if (!prev || e.workedMs > prev.workedMs) byKey.set(e.dateKey, { dateKey: e.dateKey, workedMs: e.workedMs, hoy: false, entry: e });
  }
  if (cur && !Number.isNaN(toMs(cur.dateKey))) {
    const prev = byKey.get(cur.dateKey);
    if (!prev || cur.workedMs >= prev.workedMs) byKey.set(cur.dateKey, { dateKey: cur.dateKey, workedMs: cur.workedMs, hoy: true, entry: null });
  }

  const keys = [...byKey.keys()].filter((k) => !Number.isNaN(toMs(k))).sort();
  const last = cur && !Number.isNaN(toMs(cur.dateKey)) ? cur.dateKey : keys[keys.length - 1];
  const dias: ChronicleDay[] = [];
  if (last) {
    for (let i = span - 1; i >= 0; i--) {
      const k = toKey(toMs(last) - i * DAY);
      dias.push(byKey.get(k) ?? { dateKey: k, workedMs: 0, hoy: false, entry: null });
    }
  }

  const worked = (k: string) => (byKey.get(k)?.workedMs ?? 0) > 0;
  let racha = 0;
  if (last) {
    // Hoy sin trabajar todavía no rompe la racha: se cuenta desde ayer.
    let t = toMs(last) - (worked(last) ? 0 : DAY);
    while (worked(toKey(t))) {
      racha++;
      t -= DAY;
    }
  }
  let mejorRacha = 0;
  let run = 0;
  let prevMs = NaN;
  for (const k of keys) {
    if (!worked(k)) continue;
    run = Math.round((toMs(k) - prevMs) / DAY) === 1 ? run + 1 : 1;
    prevMs = toMs(k);
    mejorRacha = Math.max(mejorRacha, run);
  }

  const records = { horasMs: 0, horasDia: '', tramo: 0, tramoDia: '', profundidad: 0, era: 0 };
  const consider = (dateKey: string, workedMs: number, maxZone: number, depth: number, era: number) => {
    if (workedMs > records.horasMs) {
      records.horasMs = workedMs;
      records.horasDia = dateKey;
    }
    if (maxZone + 1 > records.tramo && workedMs > 0) {
      records.tramo = maxZone + 1;
      records.tramoDia = dateKey;
    }
    records.profundidad = Math.max(records.profundidad, depth);
    records.era = Math.max(records.era, era);
  };
  for (const e of save.chronicle) consider(e.dateKey, e.workedMs, e.maxZone, e.depthM, e.era);
  if (cur && cur.workedMs > 0) consider(cur.dateKey, cur.workedMs, cur.maxZone, Math.round(depthMeters(cur)), cur.era + 1);

  const jugados = [...byKey.values()].filter((d) => d.workedMs > 0);
  return { dias, racha, mejorRacha, diasJugados: jugados.length, totalMs: jugados.reduce((a, d) => a + d.workedMs, 0), records };
}
