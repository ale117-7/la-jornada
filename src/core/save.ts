import { DEFAULT_SETTINGS } from '../data/balance';
import type { SaveData } from './types';

export const SAVE_VERSION = 4;
const KEY = 'la-jornada-save';

/** Abstracción del almacenamiento (localStorage en web). */
export interface SaveStore {
  read(): string | null;
  write(json: string): void;
  /** Guarda aparte una partida que no se pudo cargar, antes de que se escriba encima. */
  quarantine?(raw: string, reason: string): void;
}

/** Resultado de cargar: la partida y, si hubo problemas, qué pasó. */
export interface LoadResult {
  data: SaveData;
  /** 'nueva': la partida es de una versión más nueva (no se debe guardar encima). 'rechazada': no se pudo leer. */
  problem: null | 'nueva' | 'rechazada';
}

export class LocalStorageStore implements SaveStore {
  read(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  write(json: string): void {
    try {
      localStorage.setItem(KEY, json);
    } catch (e) {
      console.warn('No se pudo guardar', e);
    }
  }
  quarantine(raw: string): void {
    try {
      localStorage.setItem(`${KEY}-rechazado-${Date.now()}`, raw);
    } catch {
      /* sin espacio: no hay nada más que hacer */
    }
  }
}

export class MemoryStore implements SaveStore {
  private data: string | null = null;
  read(): string | null {
    return this.data;
  }
  write(json: string): void {
    this.data = json;
  }
}

export function emptySave(): SaveData {
  return { version: SAVE_VERSION, current: null, chronicle: [], settings: { ...DEFAULT_SETTINGS } };
}

export function loadSave(store: SaveStore): SaveData {
  return loadSaveChecked(store).data;
}

/**
 * Carga la partida. Si no se puede usar, se guarda aparte una copia (nunca se pierde la Crónica
 * en silencio) y se informa del problema. Una partida de una versión más nueva no se toca.
 */
export function loadSaveChecked(store: SaveStore): LoadResult {
  const raw = store.read();
  if (!raw) return { data: emptySave(), problem: null };
  const reject = (problem: 'nueva' | 'rechazada', reason: string): LoadResult => {
    store.quarantine?.(raw, reason);
    return { data: emptySave(), problem };
  };
  try {
    const data = JSON.parse(raw) as SaveData;
    if (!data || typeof data.version !== 'number') return reject('rechazada', 'formato desconocido');
    if (data.version > SAVE_VERSION) return reject('nueva', `versión ${data.version} > ${SAVE_VERSION}`);
    // Migraciones de esquema.
    if (data.version === 3) {
      // v3 → v4 (sucesos, sub-capas, criaturas procedurales): la jornada en curso empieza de nuevo.
      data.current = null;
      data.version = 4;
    }
    if (data.version === 2) {
      // v2 → v3 (eras, Base, monedas): la jornada en curso no es compatible y empieza de nuevo.
      data.current = null;
      data.version = 4;
    }
    if (data.version === 1) {
      // v1 → v2 (Encrucijadas y build): la jornada en curso no es compatible; se conservan
      // la Crónica y los ajustes, y el día empieza de nuevo.
      data.current = null;
      data.version = 4;
    }
    data.settings = { ...DEFAULT_SETTINGS, ...data.settings };
    data.chronicle = (data.chronicle ?? []).map((c) => ({ ...c, cartas: c.cartas ?? [], sinergias: c.sinergias ?? {}, era: c.era ?? 1, condicion: c.condicion ?? 'normal', combos: c.combos ?? [], rarezas: c.rarezas ?? [], criaturas: c.criaturas ?? 0, eventos: c.eventos ?? 0, cadenas: c.cadenas ?? [], subcapa: c.subcapa ?? null }));
    return { data, problem: null };
  } catch (e) {
    return reject('rechazada', String(e));
  }
}

export function writeSave(store: SaveStore, data: SaveData): void {
  store.write(JSON.stringify(data));
}
