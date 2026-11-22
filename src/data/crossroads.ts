// Calendario de Encrucijadas. La hora exacta se sortea con la semilla dentro de cada ventana.
export type CrossroadsType = 'origen' | 'companero' | 'rumbo' | 'pacto' | 'destino';

export interface CrossroadsSlot {
  tipo: CrossroadsType;
  /** Ventana en minutos trabajados [desde, hasta]. */
  ventanaMin: [number, number];
}

// Hasta las 5:00 el calendario es fijo; en Lo Hondo se programa una de Destino cada 60–90 min, sin fin.
export const CROSSROADS_SCHEDULE: CrossroadsSlot[] = [
  { tipo: 'origen', ventanaMin: [0, 0] },
  { tipo: 'companero', ventanaMin: [60, 105] },
  { tipo: 'rumbo', ventanaMin: [135, 180] },
  { tipo: 'pacto', ventanaMin: [210, 255] },
  { tipo: 'companero', ventanaMin: [266, 274] },
  { tipo: 'destino', ventanaMin: [300, 300] },
];

export const CROSSROADS_NAMES: Record<CrossroadsType, string> = {
  origen: 'Origen',
  companero: 'Compañero',
  rumbo: 'Rumbo',
  pacto: 'Pacto',
  destino: 'Destino',
};

export const CARDS_PER_CROSSROADS = 3;
/** En Lo Hondo: minutos entre Encrucijadas (cada 60 a partir de los Ciclos Invertidos). */
export const DESTINO_CADA_MIN: [number, number] = [60, 90];
/** Probabilidad de que una carta de la Encrucijada sea un Artefacto (desde la Era II). */
export const RELIC_CARD_PROB = 0.35;
/** Peso ×1.5 si la carta comparte etiqueta con la build; ×1.3 si es nueva en la Crónica. */
export const WEIGHT_SHARED_TAG = 1.5;
export const WEIGHT_NEW = 1.3;
