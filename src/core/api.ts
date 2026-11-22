// Contrato entre la interfaz y el juego. En navegador lo cumple `Game` directamente;
// en escritorio lo cumple `RemoteGame`, que habla por IPC con la simulación del proceso principal.
import type { DayState, SaveData, Settings } from './types';

export interface GameApi {
  readonly day: DayState;
  readonly save: SaveData;
  readonly speed: number;
  step(): void;
  persist(): void;
  toggle(): void;
  startDay(): void;
  chooseCard(index: number): void;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;
  // debug
  forceCrossroads(): void;
  setSpeed(speed: number): void;
  resetDay(seed?: number): void;
  jumpToHour(hours: number): void;
  shiftDate(days: number | null): void;
  setCutoffHour(hour: number): void;
  /** Solo en escritorio: preferencias de la carcasa (overlay, inactividad, inicio con Windows). */
  readonly desktop?: DesktopSettings;
  setDesktop?<K extends keyof DesktopSettings>(key: K, value: DesktopSettings[K]): void;
  /** Solo en escritorio: asigna un atajo global ("" lo quita). */
  setShortcut?(id: ShortcutId, accel: string): void;
  /** Solo en escritorio: suspende los atajos globales mientras se graba uno nuevo. */
  pauseShortcuts?(paused: boolean): void;
}

export type ShortcutId = 'toggleWork' | 'toggleOverlay' | 'openPanel' | 'openCrossroads' | 'sizeUp' | 'sizeDown';

export interface ShortcutInfo {
  /** Lo configurado ("" = sin atajo). */
  configurado: string;
  /** Lo que quedó registrado de verdad (puede ser una alternativa), o "". */
  activo: string;
  /** 'ok' · 'alternativa' (el configurado estaba ocupado) · 'ocupado' (ninguno libre) · 'sin atajo'. */
  estado: 'ok' | 'alternativa' | 'ocupado' | 'sin atajo';
}

/** Preferencias de la app de escritorio que se pueden cambiar desde la pantalla de ajustes. */
export interface DesktopSettings {
  layout: OverlayLayout;
  /** Alto de la franja en px (60–300). */
  stripHeight: number;
  overlayVisible: boolean;
  /** Monitor del overlay (null = el principal) y los monitores conectados. */
  displayId: number | null;
  displays: { id: number; nombre: string }[];
  /** Opacidad del overlay (0.2–1). */
  opacity: number;
  /** El runner se vuelve casi transparente cuando el cursor se acerca. */
  fadeOnHover: boolean;
  /** Oculta el overlay mientras haya una aplicación en pantalla completa. */
  hideOnFullscreen: boolean;
  /** FPS del overlay (30 o 15). */
  fps: number;
  /** Pausa automática tras estos minutos sin tocar teclado ni ratón (0 = desactivada; 5–30). */
  idlePauseMin: number;
  /** «Iniciar con Windows»: si Windows la va a arrancar de verdad (no solo si está pedido). */
  autoStart: boolean;
  /** Atajos globales: lo configurado, lo registrado y su estado. */
  shortcuts: Record<ShortcutId, ShortcutInfo>;
  /** false si este equipo no permite detectar aplicaciones a pantalla completa. */
  fullscreenAvailable: boolean;
  /** La partida es de una versión más nueva de La Jornada: no se guarda nada. */
  readOnly: boolean;
}

export type OverlayLayout = 'bottom' | 'top' | 'float' | 'mini';

export interface Snapshot {
  save: SaveData;
  speed: number;
  overlay: {
    layout: OverlayLayout;
    fps: number;
    /** Alto de la franja (sin las cartas desplegadas). */
    bandHeight: number;
    bandWidth: number;
    /** Las cartas de la Encrucijada están desplegadas junto a la franja. */
    expanded: boolean;
    cardsSide: 'above' | 'below';
    /** El cursor está cerca y «desvanecer al pasar el mouse» está activo. */
    faded: boolean;
  };
  /** Solo para el panel (el overlay no lo necesita). */
  desktop?: DesktopSettings;
  /** true: `save.chronicle` no se envió porque no cambió (el cliente conserva la anterior). */
  chronicleOmitted?: boolean;
}

export type Command =
  | 'toggle'
  | 'startDay'
  | 'chooseCard'
  | 'setSetting'
  | 'forceCrossroads'
  | 'setSpeed'
  | 'resetDay'
  | 'jumpToHour'
  | 'shiftDate'
  | 'setCutoffHour'
  | 'openPanel'
  | 'setDesktop'
  | 'setShortcut'
  | 'pauseShortcuts';

/** Lo que el preload de Electron expone en `window.jornada`. */
export interface DesktopBridge {
  getState(): Promise<Snapshot>;
  onState(cb: (s: Snapshot) => void): void;
  cmd(name: Command, ...args: unknown[]): Promise<Snapshot>;
  /** Rectángulos (px de la ventana) de los controles del overlay que deben recibir clics. */
  setHitRects(rects: { x: number; y: number; w: number; h: number }[]): void;
  drag(active: boolean): void;
  /** Despliega o recoge las cartas de la Encrucijada en el overlay. */
  expand(open: boolean): void;
  /** El overlay recibe ahora los clics (el cursor está sobre un control). */
  onPointer(cb: (inside: boolean) => void): void;
}

declare global {
  interface Window {
    jornada?: DesktopBridge;
  }
}
