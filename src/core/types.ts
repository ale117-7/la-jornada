import type { EquipSlot } from '../data/buildings';
import type { CrossroadsType } from '../data/crossroads';
import type { CurrencyId } from '../data/currencies';
import type { Efx, Visual } from '../data/efx';
import type { Corriente } from '../data/tags';
import type { Efectos, Mods } from './mods';

export type Status = 'RUNNING' | 'PAUSED';

export interface HeroState {
  spriteKey: string;
  /** Posición dentro del tramo actual, en metros. */
  x: number;
  hp: number;
  atkTimerMs: number;
  /** > 0 mientras espera para reaparecer. */
  deadMs: number;
  /** Golpes dados (para el golpe fuerte cada N). */
  hits: number;
}

export interface Creature {
  familyId: string;
  x: number;
  hp: number;
  maxHp: number;
  atk: number;
  gold: number;
  atkTimerMs: number;
  /** Umbral (jefe). */
  boss?: boolean;
  nombre?: string;
  /** Modificadores procedurales (ids). */
  mods?: string[];
  /** Híbrido con esta otra familia. */
  hib?: string;
  /** Criatura especial de un suceso (mini-jefe, jefe errante, Umbral de sub-capa). */
  elite?: boolean;
  /** Lo que ocurre al derrotarla. */
  premio?: Efx;
  /** Multiplicador del intervalo de ataque. */
  iv?: number;
  explota?: boolean;
  divide?: boolean;
  /** Tamaño relativo al dibujarla. */
  size?: number;
}

export interface LogEntry {
  /** Tiempo trabajado en el que ocurrió. */
  t: number;
  text: string;
}

export interface CompanionState {
  id: string;
  evolved: boolean;
  /** Contadores del día en el momento de unirse (la misión cuenta desde ahí). */
  base: { kills: number; zone: number; totalGold: number; workedMs: number };
}

export interface BuildState {
  entryId: string | null;
  chassisId: string | null;
  companions: CompanionState[];
  regionId: string | null;
  pactId: string | null;
  /** Artefactos (reliquias) obtenidos hoy. */
  relics: string[];
  /** Cartas de Destino elegidas hoy. */
  destinos: string[];
  /** Efectos ocultos ("???") ya revelados, y extras de cartas especiales. */
  extras: { cardId: string; texto: string; efectos: Efectos }[];
}

export interface EquipItem {
  nombre: string;
  /** Grado (nivel del taller que lo fabricó). */
  grado: number;
  /** Puntaje de poder: la IA equipa si es mayor. */
  poder: number;
}

export interface BaseState {
  /** Nivel de cada edificio. */
  buildings: Record<string, number>;
  accMs: number;
  craftMs: Record<EquipSlot, number>;
  blessing: { id: string; untilMs: number } | null;
  nextBlessingMs: number;
}

export interface BossState {
  /** Caídas contra el Umbral del tramo actual. */
  deaths: number;
  /** > 0: farmeando los tramos anteriores hasta este tiempo trabajado. */
  farmUntilMs: number;
  farmFlip: number;
  seen: boolean;
  /** Tiempo trabajado en que el héroe lo tuvo delante por primera vez. */
  seenAtMs: number;
}

export interface TimedBuff {
  id: string;
  nombre: string;
  efectos: Efectos;
  untilMs: number;
  visual?: Visual;
}

export interface SubLayerState {
  /** Hora trabajada en la que empezó. */
  hora: number;
  nombre: string;
  mecanicas: string[];
  /** Modificador de Anomalía forzado (Ciclos Invertidos). */
  anomalia: string | null;
  /** Grado de Ciclo (0 antes de los Ciclos Invertidos). */
  ciclo: number;
  umbralDone: boolean;
  hitosDone: number;
}

/** Todo lo que cambia el día alrededor del héroe: condición, eventos, cadenas, sub-capas… */
export interface WorldState {
  /** RNG propio de los sucesos (no depende del camino de la simulación). */
  rngState: number;
  condicion: string;
  nextEventMs: number;
  /** Eventos ocurridos hoy, en orden, y cuándo. */
  eventos: string[];
  eventosT: number[];
  rarezas: { id: string; atMs: number; done: boolean }[];
  buffs: TimedBuff[];
  /** Efectos para el resto del día concedidos por sucesos. */
  permanentes: Efectos[];
  pendientes: { atMs: number; efecto: Efx; texto?: string }[];
  cadenas: { id: string; parte: number; tiempos: number[] }[];
  /** Índice del siguiente hito fijo de la ruta. */
  rutaHechos: string[];
  capaGarantizada: boolean;
  sub: SubLayerState | null;
  mutaciones: string[];
  nextMutacionMs: number;
  flags: { revelaOculto: boolean; cuatroCartas: boolean; anuncioTemprano: boolean; espejo: boolean };
  /** Combos secretos descubiertos hoy y combos cuya receta ha sido revelada. */
  combos: string[];
  combosRevelados: string[];
  /** Bestiario del día: hashes de las combinaciones vistas. */
  bestiario: number[];
  modsVistos: string[];
  modsVistosT: number[];
  recuerdos: number;
  lore: number;
  /** El héroe está bloqueado (derrumbe, contemplación…). */
  pausaMs: number;
  /** Tramos por avanzar de golpe. */
  salto: number;
  /** Presión actual (0–100+). */
  presion: number;
  respiracion: number;
  ultimaFiesta: number;
  accMs: number;
  /** Algo cambió y hay que recalcular los modificadores. */
  dirty: boolean;
  novedad: {
    lastMs: number;
    maxGapMs: number;
    maxGapAtMs: number;
    lastOtrasMs: number;
    maxGapOtrasMs: number;
    /** Novedades por hora trabajada (sin contar criaturas) y criaturas nuevas por hora. */
    porHora: number[];
    criaturasPorHora: number[];
  };
}

export interface Hito {
  id: string;
  t: number;
  text: string;
}

export interface ScheduledCrossroads {
  tipo: CrossroadsType;
  atMs: number;
  done: boolean;
}

export interface OfferedCard {
  /** 'origen:<entrada>+<chasis>' · 'comp:<id>' · 'rumbo:<id>' */
  id: string;
  /** Tiene una línea "???" que se revela al elegirla. */
  oculto: boolean;
  nuevo: boolean;
  /** Un suceso reveló lo que esconde el ???. */
  revelado?: boolean;
}

export interface PendingCrossroads {
  /** Índice en scheduledCrossroads. */
  index: number;
  tipo: CrossroadsType;
  sinceMs: number;
  cards: OfferedCard[];
}

export interface DayState {
  dateKey: string;
  nonce: number;
  seed: number;
  rngState: number;
  workedMs: number;
  tickRemainderMs: number;
  status: Status;
  /** false hasta que se cierra la pantalla "Nueva Jornada". */
  introSeen: boolean;
  zone: number; // 0-based; se muestra como tramo zone+1
  /** Era actual (0-based: 0 = Era I). */
  era: number;
  /** Umbral de era derrotado: se espera al umbral de tiempo de la siguiente era. */
  eraWait: boolean;
  boss: BossState;
  maxZone: number;
  zoneDeaths: number;
  hero: HeroState;
  creatures: Creature[]; // criaturas vivas del tramo, ordenadas por x
  /** Corriente activa (null hasta elegir el Origen). */
  corriente: Corriente | null;
  /** Familias de la ruta actual: la 2.ª aparece a los 15 min. */
  familyIds: string[];
  unlockedFamilies: string[];
  gold: number;
  totalGold: number;
  kills: number;
  deaths: number;
  upgrades: Record<string, number>;
  aiTimerMs: number;
  // --- eras: monedas, Base, equipo, mascotas ---
  currencies: Record<CurrencyId, number>;
  unlockedCurrencies: CurrencyId[];
  base: BaseState;
  equipment: Record<EquipSlot, EquipItem | null>;
  pets: { id: string; level: number }[];
  /** Niveles de las mejoras de Ecos y de Fragmentos. */
  meta: Record<string, number>;
  hitos: Hito[];
  world: WorldState;
  // --- build, sinergias y Encrucijadas ---
  build: BuildState;
  /** Nº de elementos de la build con cada etiqueta. */
  synergies: Record<string, number>;
  /** Modificadores combinados de la build (derivado; se recalcula al cambiar la build). */
  mods: Mods;
  scheduledCrossroads: ScheduledCrossroads[];
  pendingCrossroads: PendingCrossroads | null;
  chosenCards: string[];
  /** Cartas ya vistas en días anteriores (de la Crónica): para "nuevo" y los pesos. */
  seenCards: string[];
  /** Combos secretos ya descubiertos en días anteriores. */
  knownCombos: string[];
  /** Tiempo trabajado tras el que el Destino elige solo (0 = desactivado). */
  autoChooseMs: number;
  eventLog: LogEntry[];
  lastTickRealTime: number;
}

export interface ChronicleEntry {
  dateKey: string;
  workedMs: number;
  maxZone: number;
  depthM: number;
  kills: number;
  totalGold: number;
  /** Era máxima alcanzada (1–5). */
  era: number;
  /** Cartas elegidas ese día (ids). */
  cartas: string[];
  /** Sinergias logradas: etiqueta → nº de elementos. */
  sinergias: Record<string, number>;
  /** Fase 4: condición del día, combos secretos descubiertos, rarezas vistas, criaturas únicas y cadenas. */
  condicion: string;
  combos: string[];
  rarezas: string[];
  criaturas: number;
  eventos: number;
  cadenas: { id: string; partes: number; total: number }[];
  /** Sub-capa más profunda alcanzada. */
  subcapa: string | null;
}

export interface Settings {
  cutoffHour: number;
  gapThresholdMs: number;
  debugClockOffsetMs: number;
  /** Auto-elegir en una Encrucijada tras este tiempo trabajado (10–60 min; 0 = desactivado). */
  autoChooseMs: number;
  sound: boolean;
  notifications: boolean;
}

export interface SaveData {
  version: number;
  current: DayState | null;
  chronicle: ChronicleEntry[];
  settings: Settings;
}
