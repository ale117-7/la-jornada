// Conduce la simulación con el reloj real: huecos, velocidad, cambio de día y guardado.
import type { GameApi } from './api';
import { applyChoice, forceCrossroads, originPending } from './crossroads';
import { loadSaveChecked, writeSave, type SaveStore } from './save';
import { advance, createDay, depthMeters, pushLog } from './sim';
import type { DayState, SaveData, Settings } from './types';

/** Clave del día de juego: la fecha local desplazada por la hora de corte. */
export function dateKeyFor(nowMs: number, cutoffHour: number): string {
  const d = new Date(nowMs - cutoffHour * 3_600_000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export class Game implements GameApi {
  save: SaveData;
  /** Multiplicador de tiempo (solo debug). */
  speed = 1;
  private lastReal: number;
  /** Instante en que el sistema se suspendió (escritorio), o null. */
  private suspendedAt: number | null = null;
  /**
   * La partida guardada es de una versión más nueva de La Jornada: se juega, pero no se guarda
   * nada para no estropearla.
   */
  readonly readOnly: boolean;
  /** Problema al cargar la partida (para avisar al usuario), o null. */
  readonly loadProblem: null | 'nueva' | 'rechazada';
  /** Tiempo trabajado retenido mientras no hay actividad (ver `hold`). */
  private heldMs = 0;
  private holding = false;

  constructor(
    private store: SaveStore,
    /** Reloj real en ms (Date.now). */
    private clock: () => number,
    /** Nonce aleatorio para la semilla del día (fuera de la lógica de juego). */
    private nonce: () => number,
  ) {
    const loaded = loadSaveChecked(store);
    this.save = loaded.data;
    this.loadProblem = loaded.problem;
    this.readOnly = loaded.problem === 'nueva';
    this.lastReal = clock();
    if (this.save.current) this.save.current.status = 'PAUSED'; // siempre arranca en pausa
    this.checkDay();
    if (loaded.problem === 'nueva') pushLog(this.day, 'Tu partida es de una versión más nueva de La Jornada. Esta versión no guardará nada para no estropearla.');
    else if (loaded.problem === 'rechazada') pushLog(this.day, 'La partida guardada no se pudo leer. Se apartó una copia junto al guardado y empieza una jornada nueva.');
  }

  get day(): DayState {
    return this.save.current!;
  }

  /** Hora "lógica": reloj real + desfase de debug. Solo se usa para decidir la fecha. */
  now(): number {
    return this.clock() + this.save.settings.debugClockOffsetMs;
  }

  todayKey(): string {
    return dateKeyFor(this.now(), this.save.settings.cutoffHour);
  }

  /** Crea la jornada si no existe o si cambió el día (archivando la anterior). */
  checkDay(): boolean {
    const key = this.todayKey();
    const cur = this.save.current;
    if (cur && cur.dateKey === key) return false;
    if (cur && cur.workedMs > 0) {
      this.save.chronicle.push({
        dateKey: cur.dateKey,
        workedMs: cur.workedMs,
        maxZone: cur.maxZone,
        depthM: Math.round(depthMeters(cur)),
        kills: cur.kills,
        totalGold: cur.totalGold,
        era: cur.era + 1,
        cartas: cur.chosenCards,
        sinergias: cur.synergies,
        condicion: cur.world.condicion,
        combos: cur.world.combos,
        rarezas: cur.world.rarezas.filter((r) => r.done).map((r) => r.id),
        criaturas: cur.world.bestiario.length,
        eventos: cur.world.eventos.length,
        cadenas: cur.world.cadenas.map((c) => ({ id: c.id, partes: c.parte, total: c.tiempos.length })),
        subcapa: cur.world.sub?.nombre ?? null,
      });
    }
    this.save.current = this.newDay(key);
    this.persist();
    return true;
  }

  private newDay(key: string, seed?: number): DayState {
    return createDay(key, this.nonce(), seed, {
      seenCards: [...new Set(this.save.chronicle.flatMap((c) => c.cartas))],
      knownCombos: [...new Set(this.save.chronicle.flatMap((c) => c.combos))],
      autoChooseMs: this.save.settings.autoChooseMs,
    });
  }

  /** Llamar periódicamente (intervalo de 1 s y cada frame visible). */
  step(): void {
    if (this.suspendedAt !== null) return;
    const real = this.clock();
    const elapsed = real - this.lastReal;
    this.lastReal = real;
    this.checkDay();
    const day = this.day;
    if (elapsed <= 0 || day.status !== 'RUNNING') return;
    if (elapsed > this.save.settings.gapThresholdMs) {
      // PC suspendida o navegador congelado: ese hueco no cuenta como trabajado.
      pushLog(day, `Pausa automática: el equipo estuvo dormido ${Math.round(elapsed / 60_000)} min.`);
      return;
    }
    if (this.holding) {
      this.heldMs += elapsed * this.speed;
      return;
    }
    advance(day, elapsed * this.speed);
    day.lastTickRealTime = real;
  }

  setRunning(running: boolean): void {
    this.step(); // contabiliza hasta este instante antes de cambiar de estado
    // Pausar o reanudar a mano cuenta como actividad: lo retenido se suma.
    if (this.holding) this.releaseHold();
    // Sin Origen elegido la jornada no puede empezar.
    this.day.status = running && !originPending(this.day) ? 'RUNNING' : 'PAUSED';
    this.lastReal = this.clock();
    if (!running) this.persist();
  }

  toggle(): void {
    if (!this.day.introSeen) return this.startDay();
    this.setRunning(this.day.status !== 'RUNNING');
  }

  /** Cierra la pantalla "Nueva Jornada". La jornada arranca al elegir el Origen. */
  startDay(): void {
    this.day.introSeen = true;
    this.setRunning(true);
  }

  /** Elige una carta de la Encrucijada pendiente. Elegir el Origen pone la jornada en marcha. */
  chooseCard(index: number): void {
    const p = this.day.pendingCrossroads;
    if (!p || !p.cards[index]) return;
    this.step();
    applyChoice(this.day, index);
    if (p.tipo === 'origen') {
      this.day.introSeen = true;
      this.setRunning(true);
    }
    this.persist();
  }

  persist(): void {
    if (this.readOnly) return;
    writeSave(this.store, this.save);
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.save.settings[key] = value;
    if (key === 'autoChooseMs') this.day.autoChooseMs = this.save.settings.autoChooseMs;
    this.persist();
  }

  /** El sistema se va a suspender: se contabiliza hasta ahora y se congela el reloj. */
  suspend(): void {
    if (this.suspendedAt !== null) return;
    this.step();
    this.suspendedAt = this.clock();
    this.persist();
  }

  /** El sistema volvió: el tiempo suspendido no cuenta y el estado sigue como estaba. */
  resume(): void {
    if (this.suspendedAt === null) return;
    const slept = this.clock() - this.suspendedAt;
    this.suspendedAt = null;
    this.lastReal = this.clock();
    if (this.day.status === 'RUNNING') {
      const txt = slept < 60_000 ? `${Math.round(slept / 1000)} s` : `${Math.round(slept / 60_000)} min`;
      pushLog(this.day, `Pausa automática: el equipo estuvo dormido ${txt}.`);
    }
  }

  // ----- inactividad (escritorio) -----
  // Sin teclado ni ratón durante un rato, el tiempo se retiene: si el jugador vuelve antes del
  // límite, cuenta (estaba leyendo o pensando); si no, se descarta y la jornada se pausa.

  get isHolding(): boolean {
    return this.holding;
  }

  /** Empieza a retener el tiempo trabajado (no hay actividad). */
  hold(): void {
    if (this.holding || this.day.status !== 'RUNNING') return;
    this.step();
    this.holding = true;
    this.heldMs = 0;
  }

  /** Hay actividad otra vez: el tiempo retenido cuenta. */
  releaseHold(): void {
    if (!this.holding) return;
    this.step();
    this.holding = false;
    const ms = this.heldMs;
    this.heldMs = 0;
    if (ms > 0 && this.day.status === 'RUNNING') advance(this.day, ms);
  }

  /** Pausa automática por inactividad: el tiempo retenido no cuenta. */
  pauseForIdle(idleMs: number): void {
    this.step();
    this.holding = false;
    this.heldMs = 0;
    if (this.day.status !== 'RUNNING') return;
    pushLog(this.day, `Te fuiste, pausé la jornada. Los ${Math.round(idleMs / 60_000)} min sin actividad no cuentan.`);
    this.setRunning(false);
  }

  // ----- debug -----

  setSpeed(speed: number): void {
    this.step();
    this.speed = speed;
  }

  setCutoffHour(hour: number): void {
    this.save.settings.cutoffHour = Math.max(0, Math.min(23, Math.floor(hour)));
    if (!this.checkDay()) this.persist();
  }

  forceCrossroads(): void {
    this.step();
    forceCrossroads(this.day);
  }

  resetDay(seed?: number): void {
    const d = this.newDay(this.todayKey(), seed);
    d.introSeen = true;
    this.save.current = d;
    this.persist();
  }

  jumpToHour(hours: number): void {
    const target = hours * 3_600_000;
    if (target < this.day.workedMs) this.resetDay(this.day.seed);
    advance(this.day, target - this.day.workedMs);
    this.lastReal = this.clock();
    this.persist();
  }

  shiftDate(days: number | null): void {
    this.step();
    const st = this.save.settings;
    st.debugClockOffsetMs = days === null ? 0 : st.debugClockOffsetMs + days * 86_400_000;
    if (!this.checkDay()) this.persist();
  }
}
