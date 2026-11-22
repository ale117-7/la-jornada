// Constantes de balance y de simulación. Cambiar aquí, no en la lógica.
export const BAL = {
  TICK_MS: 100,
  /** Por encima de este delta de juego se usa la simulación rápida (3.2). */
  FAST_SIM_THRESHOLD_MS: 60_000,
  ZONE_LENGTH_M: 500,
  RESPAWN_MS: 5_000,
  AI_BUY_INTERVAL_MS: 2_000,
  /** Cada muerte en el mismo tramo debilita a sus criaturas (nunca se bloquea la jornada). */
  DEATH_DEBUFF: 0.9,

  CREATURES_PER_ZONE_MIN: 4,
  CREATURES_PER_ZONE_MAX: 6,
  CREATURE_FIRST_X: 90,
  CREATURE_LAST_X: 470,
  CREATURE_MIN_GAP: 42,
  /** La 2.ª familia de criaturas aparece a los 15 min trabajados. */
  SECOND_FAMILY_MS: 15 * 60_000,

  CREATURE_HP_BASE: 10,
  CREATURE_HP_GROWTH: 1.11,
  CREATURE_ATK_BASE: 2,
  CREATURE_ATK_GROWTH: 1.1,
  CREATURE_GOLD_BASE: 1,
  CREATURE_GOLD_GROWTH: 1.09,
  UPGRADE_COST_GROWTH: 1.15,

  HERO_BASE: {
    vida: 100,
    ataque: 5,
    velocidadAtaque: 1, // golpes por segundo
    critico: 0.05,
    danoCritico: 2,
    defensa: 0,
    regeneracion: 0.01, // fracción de la vida máxima por segundo
    alcance: 15, // metros
    velocidad: 4, // metros por segundo
  },

  LOG_MAX: 60,
  /** Tope de combinaciones guardadas en el bestiario del día. */
  BESTIARIO_MAX: 4000,

  // --- Fase 3: Umbrales, Base y oficios ---
  /** Un Umbral suelta esta cantidad de veces la moneda de una criatura. */
  BOSS_GOLD_MULT: 20,
  BOSS_X: 488,
  /** Tras 3 caídas contra el mismo Umbral, el héroe farmea los 2 tramos anteriores este tiempo. */
  BOSS_DEATHS_TO_FARM: 3,
  FARM_MS: 3 * 60_000,
  /** Tramos que retrocede para farmear (alterna entre ese y el siguiente). */
  FARM_BACK: 3,
  /** Tras caer ante las criaturas de un tramo (sin Umbral), el héroe farmea este tiempo por caída. */
  ZONE_FARM_MS: 90_000,
  /** El farmeo se alarga con cada retirada ante el mismo muro, hasta este múltiplo. */
  FARM_MAX_MULT: 4,
  /** Debuff progresivo: el Umbral pierde esta fracción por minuto desde que se le vio (nunca bloquea la jornada). */
  BOSS_TIME_DEBUFF_PER_MIN: 0.02,
  BOSS_TIME_DEBUFF_FLOOR: 0.3,
  /** El montacargas (Base nivel 1) llega a los 45 min trabajados. */
  MONTACARGAS_MS: 45 * 60_000,
  /** Cada oficio intenta fabricar una pieza cada este tiempo. */
  CRAFT_MS: 4 * 60_000,
  CRAFT_COST: 12,
  PET_HATCH_COST: 40,
  PET_LEVEL_COST: 12,
  PET_LEVEL_GROWTH: 1.45,
  BLESSING_EVERY_MS: 30 * 60_000,
  BLESSING_MS: 10 * 60_000,
} as const;

export const DEFAULT_SETTINGS = {
  cutoffHour: 4,
  gapThresholdMs: 10 * 60_000,
  /** Solo debug: desfase del reloj para probar el cambio de fecha. */
  debugClockOffsetMs: 0,
  /** Si pasan 20 min trabajados sin elegir en una Encrucijada, el Destino elige (0 = desactivado). */
  autoChooseMs: 20 * 60_000,
  sound: true,
  notifications: true,
};
