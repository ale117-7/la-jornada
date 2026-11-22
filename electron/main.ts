// Proceso principal de Electron. Aquí vive la ÚNICA simulación (el núcleo de src/core);
// el overlay y el panel completo solo muestran el estado que reciben por IPC.
import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, Notification, powerMonitor, screen, shell, Tray, type Rectangle } from 'electron';
import { execFile } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';
import type { Command, DesktopSettings, OverlayLayout, ShortcutId, ShortcutInfo, Snapshot } from '../src/core/api';
import { Game } from '../src/core/game';
import type { Settings } from '../src/core/types';
import { CROSSROADS_NAMES } from '../src/data/crossroads';
import { DEFAULT_SHORTCUTS, LAYOUTS, loadConfig, saveConfig, SHORTCUT_FALLBACKS, SIZE_PRESETS, type DesktopConfig } from './config';
import { FileStore } from './fileStore';
import { FullscreenWatcher, type FullscreenRect } from './fullscreen';
import { trayIcon } from './icons';

const DEV = !app.isPackaged;
const DEBUG_UI = DEV || process.argv.includes('--jornada-debug');
/** Autoguardado mientras se juega (al pausar, elegir o salir también se guarda). */
const AUTOSAVE_MS = 15_000;
const LOOP_MS = 100;
/** En pausa, el estado se envía a las ventanas como mucho una vez por segundo. */
const PAUSED_BROADCAST_MS = 1000;
/** Segundos sin teclado ni ratón tras los que el tiempo trabajado se retiene (ver Game.hold). */
const IDLE_HOLD_S = 60;
/**
 * En Windows todas las ventanas «siempre encima» comparten nivel: gana la última activada. Cada
 * tanto el overlay vuelve a ponerse encima (sin tomar el foco) para que otra no lo tape.
 */
const TOPMOST_EVERY_MS = 2000;
const FLOAT_SIZE = { width: 420, height: 240 };
const MINI_SIZE = { width: 250, height: 44 };

let game: Game;
let cfg: DesktopConfig;
let userDir: string;
let overlay: BrowserWindow | null = null;
let panel: BrowserWindow | null = null;
let tray: Tray | null = null;
let lastSave = Date.now();
let trayRunning: boolean | null = null;
let lastCrossroadsKey = '';
/** Cartas de la Encrucijada desplegadas en el overlay. */
let expanded = false;
let cardsSide: 'above' | 'below' = 'above';
const CARDS_HEIGHT = 300;
const CARDS_MIN_WIDTH = 760;
let dragTimer: NodeJS.Timeout | null = null;
/** Monitor (píxeles físicos) con una aplicación a pantalla completa, o null. */
let fullscreenMon: FullscreenRect | null = null;
/** Hay una aplicación a pantalla completa en el monitor del overlay, y el overlay se ocultó por ello. */
let fullscreenApp = false;
/** El cursor está cerca del overlay (para «desvanecer al pasar el mouse»). */
let faded = false;
const FADE_MARGIN = 24;
/** «Iniciar con Windows» se lee del registro: se guarda para no consultarlo 10 veces por segundo. */
let autoStartCache: boolean | null = null;
const fullscreen = new FullscreenWatcher(
  (mon) => {
    fullscreenMon = mon;
    syncOverlayVisibility();
  },
  () => broadcast(),
);
/** El overlay se ocultó tras fallar varias veces seguidas; solo vuelve si el usuario lo pide. */
let overlayDisabledByCrash = false;
/** Notificaciones vivas: si el recolector de basura se las lleva, su clic deja de funcionar. */
const liveNotifications = new Set<Notification>();
let lastBroadcast = 0;
let lastTopmost = 0;
/** Fallos seguidos del bucle principal (para no repetir el mismo error 10 veces por segundo). */
let loopFailures = 0;

/** ¿La app a pantalla completa está en el mismo monitor que el overlay? */
function fullscreenOnOverlayMonitor(): boolean {
  if (!fullscreenMon) return false;
  const d = screen.getDisplayMatching(baseBounds());
  const p = screen.dipToScreenRect(null, d.bounds);
  const m = fullscreenMon;
  // Se solapan (con margen por el redondeo del escalado).
  return m.left < p.x + p.width - 4 && m.right > p.x + 4 && m.top < p.y + p.height - 4 && m.bottom > p.y + 4;
}

/** Atajo que quedó registrado de verdad para cada acción. */
const activeShortcuts: Partial<Record<ShortcutId, string>> = {};
/** Mientras se graba un atajo nuevo en Ajustes, los globales se suspenden. */
let shortcutsPaused = false;
const hint = (id: ShortcutId) =>
  activeShortcuts[id] ? `   (${activeShortcuts[id]!.replace('Control', 'Ctrl')})` : '';

// En desarrollo se usa otra carpeta de datos para no tocar la partida real ni chocar con la app instalada.
if (DEV) app.setPath('userData', path.join(app.getPath('appData'), 'La Jornada (dev)'));

if (!app.requestSingleInstanceLock()) {
  app.quit(); // una sola instancia
} else {
  app.on('second-instance', () => setOverlayVisible(true));
  app.on('window-all-closed', () => {
    /* la app sigue viva en la bandeja */
  });
  app.on('before-quit', () => {
    game?.step();
    game?.persist();
  });
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    fullscreen.stop();
  });
  void app.whenReady().then(start);
}

function start(): void {
  // Necesario en Windows para que las notificaciones nativas se muestren.
  app.setAppUserModelId(DEV ? process.execPath : 'com.lajornada.app');
  userDir = app.getPath('userData');
  cfg = loadConfig(userDir);
  saveConfig(userDir, cfg); // deja el archivo migrado y validado
  // Siempre arranca en pausa (lo garantiza Game al cargar).
  game = new Game(new FileStore(path.join(userDir, 'save.json')), () => Date.now(), () => randomInt(0, 2 ** 32));

  wireIpc();
  createOverlay();
  createTray();
  registerShortcuts();
  registerPortableNotifications();
  warnLoadProblem();

  // Suspensión de la PC: complementa la regla de huecos del núcleo.
  powerMonitor.on('suspend', () => game.suspend());
  powerMonitor.on('resume', () => game.resume());
  // Pantallas que cambian, se conectan o se desconectan: el overlay se recoloca (y vuelve al
  // monitor principal si el elegido ya no está).
  for (const ev of ['display-metrics-changed', 'display-added', 'display-removed'] as const) {
    screen.on(ev as 'display-added', () => {
      applyLayout();
      syncOverlayVisibility();
      refreshTray();
    });
  }

  if (cfg.hideOnFullscreen) fullscreen.start();
  setInterval(loop, LOOP_MS);
  pollClickThrough();

  if (DEBUG_UI) {
    // Solo en desarrollo o con --jornada-debug: acceso para pruebas con --inspect.
    (globalThis as Record<string, unknown>).__jornada = {
      game,
      cfg: () => cfg,
      overlay: () => overlay,
      panel: () => panel,
      setLayout,
      setOverlayVisible,
      setAutoStart,
      getAutoStart,
      setShortcut,
      openPanel,
      powerMonitor,
      globalShortcut,
      activeShortcuts,
      setExpanded,
      setDesktop,
      desktopSettings,
      state: () => ({ expanded, cardsSide, fullscreenApp, faded, captured, hitRects, holding: game.isHolding, overlayDisabledByCrash, lastBroadcast }),
      fullscreenMon: () => fullscreenMon,
      /** Pruebas: simula una app a pantalla completa en ese monitor (píxeles físicos). */
      simulateFullscreen: (m: FullscreenRect | null) => {
        fullscreenMon = m;
        syncOverlayVisibility();
      },
    };
  }
}

function loop(): void {
  try {
    game.step();
    const running = game.day.status === 'RUNNING';
    if (running && Date.now() - lastSave >= AUTOSAVE_MS) {
      lastSave = Date.now();
      game.persist();
    }
    checkIdle();
    checkFade();
    // Jugando, el estado cambia en cada vuelta; en pausa basta con refrescar de vez en cuando.
    if (running || Date.now() - lastBroadcast >= PAUSED_BROADCAST_MS) broadcast();
    if (running !== trayRunning) refreshTray();
    notifyCrossroads();
    if (expanded && !game.day.pendingCrossroads) setExpanded(false); // elegida (o auto-elegida): la franja vuelve a su tamaño
    if (Date.now() - lastTopmost >= TOPMOST_EVERY_MS) {
      lastTopmost = Date.now();
      // Mientras se arrastra o con el cursor encima no se toca (no interrumpe un clic).
      if (overlay && !overlay.isDestroyed() && overlay.isVisible() && !captured && !dragTimer) overlay.moveTop();
    }
    loopFailures = 0;
  } catch (e) {
    onLoopError(e);
  }
}

/**
 * Un error en el núcleo (un caso de contenido no previsto…) no debe repetirse 10 veces por
 * segundo: a la tercera vez seguida se pausa la jornada, se guarda y se avisa una sola vez.
 */
function onLoopError(e: unknown): void {
  loopFailures++;
  console.error('Error en el bucle principal', e);
  if (loopFailures !== 3) return;
  try {
    if (game.day.status === 'RUNNING') game.setRunning(false);
    game.persist();
  } catch {
    /* si ni eso funciona, al menos se avisa */
  }
  notify('La Jornada tuvo un problema', 'Pausé la jornada y guardé. Si vuelve a pasar, reinicia la app desde la bandeja.');
}

/**
 * Inactividad (opcional, «Pausar si me voy del equipo»): tras un minuto sin teclado ni ratón el
 * tiempo se retiene. Si vuelves antes del límite, cuenta; si no, se descarta y la jornada se pausa.
 */
function checkIdle(): void {
  if (cfg.idlePauseMin <= 0) {
    if (game.isHolding) game.releaseHold();
    return;
  }
  if (game.day.status !== 'RUNNING') return;
  const idle = powerMonitor.getSystemIdleTime();
  if (idle >= cfg.idlePauseMin * 60) {
    game.pauseForIdle(idle * 1000);
    broadcast();
    refreshTray();
    notify('La Jornada', 'Te fuiste, pausé la jornada. Ese rato no cuenta.');
  } else if (idle >= IDLE_HOLD_S) game.hold();
  else if (game.isHolding) game.releaseHold();
}

/** «Desvanecer al pasar el mouse»: el runner se aparta cuando el cursor se acerca a la franja. */
function checkFade(): void {
  let near = false;
  if (cfg.fadeOnHover && !expanded && overlay && !overlay.isDestroyed() && overlay.isVisible()) {
    const p = screen.getCursorScreenPoint();
    const b = overlay.getBounds();
    near = p.x >= b.x - FADE_MARGIN && p.x <= b.x + b.width + FADE_MARGIN && p.y >= b.y - FADE_MARGIN && p.y <= b.y + b.height + FADE_MARGIN;
  }
  if (near === faded) return;
  faded = near;
  broadcast();
}

/** Notificación nativa que no se pierde antes de tiempo (y cuyo clic sigue funcionando). */
function notify(title: string, body: string, onClick?: () => void): void {
  if (!game.save.settings.notifications || !Notification.isSupported()) return;
  const n = new Notification({ title, body, silent: true });
  liveNotifications.add(n);
  const done = () => liveNotifications.delete(n);
  n.on('click', () => {
    done();
    onClick?.();
  });
  n.on('close', done);
  n.on('failed', done);
  n.show();
  // Por si Windows nunca avisa del cierre: no se acumulan.
  setTimeout(done, 10 * 60_000);
}

/** Aviso (una sola vez, sin bloquear) si la partida guardada no se pudo cargar. */
function warnLoadProblem(): void {
  if (!game.loadProblem) return;
  const nueva = game.loadProblem === 'nueva';
  void dialog.showMessageBox({
    type: 'warning',
    title: 'La Jornada',
    message: nueva ? 'Tu partida es de una versión más nueva de La Jornada' : 'La partida guardada no se pudo leer',
    detail: nueva
      ? 'Esta versión no guardará nada para no estropearla. Abre la versión más nueva para seguir con tu Crónica.'
      : `Se guardó una copia aparte en:\n${userDir}\n(archivo save.rechazado-….json). Empieza una jornada nueva.`,
    buttons: ['Entendido'],
    noLink: true,
  });
}

/**
 * Notificaciones en la versión portable: Windows solo muestra las de apps con su identificador
 * registrado. El instalador lo hace con su acceso directo; la portable lo registra aquí.
 */
function registerPortableNotifications(): void {
  if (DEV || !process.env.PORTABLE_EXECUTABLE_FILE || process.platform !== 'win32') return;
  let icon = '';
  try {
    const src = path.join(process.resourcesPath, 'icon.png');
    if (existsSync(src)) {
      icon = path.join(userDir, 'icon.png');
      copyFileSync(src, icon);
    }
  } catch {
    icon = '';
  }
  const key = 'HKCU\\Software\\Classes\\AppUserModelId\\com.lajornada.app';
  const add = (name: string, value: string) =>
    execFile('reg.exe', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], { windowsHide: true }, (err) => {
      if (err) console.warn('No se pudo registrar el identificador para notificaciones', err.message);
    });
  add('DisplayName', 'La Jornada');
  if (icon) add('IconUri', icon);
}

function desktopSettings(): DesktopSettings {
  return {
    layout: cfg.layout,
    displayId: screen.getAllDisplays().some((d) => d.id === cfg.displayId) ? cfg.displayId : null,
    displays: displayList(),
    stripHeight: cfg.stripHeight,
    overlayVisible: cfg.overlayVisible,
    opacity: cfg.opacity,
    fadeOnHover: cfg.fadeOnHover,
    hideOnFullscreen: cfg.hideOnFullscreen,
    fps: cfg.fps,
    idlePauseMin: cfg.idlePauseMin,
    autoStart: getAutoStart(),
    shortcuts: shortcutInfo(),
    fullscreenAvailable: fullscreen.available,
    readOnly: game.readOnly,
  };
}

const clampNum = (v: unknown, min: number, max: number, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** Cambia una preferencia de escritorio desde la pantalla de ajustes. */
function setDesktop(key: keyof DesktopSettings, value: unknown): void {
  switch (key) {
    case 'layout':
      if (LAYOUTS.some((l) => l.id === value)) setLayout(value as OverlayLayout);
      return;
    case 'stripHeight':
      setStripHeight(Math.round(clampNum(value, 60, 300, 110)));
      return;
    case 'overlayVisible':
      setOverlayVisible(!!value);
      return;
    case 'autoStart':
      setAutoStart(!!value);
      return;
    case 'opacity':
      cfg.opacity = clampNum(value, 0.2, 1, 1);
      break;
    case 'fadeOnHover':
      cfg.fadeOnHover = !!value;
      break;
    case 'hideOnFullscreen':
      cfg.hideOnFullscreen = !!value;
      if (cfg.hideOnFullscreen) fullscreen.start();
      else fullscreen.stop();
      break;
    case 'displayId': {
      const id = value === null || value === 'null' ? null : Number(value);
      cfg.displayId = id !== null && screen.getAllDisplays().some((d) => d.id === id) ? id : null;
      // Las posiciones libres (flotante y mínimo) se recolocan en el monitor nuevo.
      cfg.floatPos = null;
      cfg.miniPos = null;
      saveConfig(userDir, cfg);
      applyLayout();
      syncOverlayVisibility();
      refreshTray();
      return;
    }
    case 'displays':
    case 'shortcuts':
      return;
    case 'fps':
      cfg.fps = Number(value) === 15 ? 15 : 30;
      break;
    case 'idlePauseMin': {
      const n = Number(value);
      cfg.idlePauseMin = n > 0 ? Math.round(clampNum(n, 5, 30, 10)) : 0;
      break;
    }
  }
  saveConfig(userDir, cfg);
  applyLayout();
  refreshTray();
}

/** Muestra u oculta el overlay según la preferencia y si hay una app en pantalla completa. */
function syncOverlayVisibility(): void {
  if (!overlay || overlay.isDestroyed()) return;
  fullscreenApp = cfg.hideOnFullscreen && fullscreenOnOverlayMonitor();
  const show = cfg.overlayVisible && !fullscreenApp && !overlayDisabledByCrash;
  if (show && !overlay.isVisible()) showOverlay();
  else if (!show && overlay.isVisible()) {
    if (expanded) setExpanded(false);
    overlay.hide();
  }
}

/**
 * Muestra el overlay sin quitar el foco. Tras mostrarse, Windows deja a Chromium con una posición
 * desfasada de la ventana y descarta los clics sobre los controles (probado con ratón real);
 * reasignar los límites justo después lo corrige. Se repite un instante después por si el
 * sistema termina de colocar la ventana de forma asíncrona.
 */
function showOverlay(): void {
  if (!overlay || overlay.isDestroyed()) return;
  overlay.showInactive();
  applyLayout();
  const win = overlay;
  setTimeout(() => {
    if (overlay === win && !win.isDestroyed() && win.isVisible()) applyLayout();
  }, 150);
}

/** Aviso nativo (y sonido suave) cuando llega una Encrucijada. Nunca toma el foco. */
function notifyCrossroads(): void {
  const p = game.day.pendingCrossroads;
  const key = p && p.tipo !== 'origen' ? `${game.day.seed}:${p.index}` : '';
  if (key === lastCrossroadsKey) return;
  lastCrossroadsKey = key;
  if (!p || !key) return;
  const st = game.save.settings;
  if (st.sound) shell.beep();
  notify('La Jornada', `⚠ Encrucijada de ${CROSSROADS_NAMES[p.tipo]}: elige tu camino.`, openCrossroads);
}

/** Tamaño de la Crónica que ya tiene cada ventana (para no reenviarla 10 veces por segundo). */
const sentChronicle = new WeakMap<Electron.WebContents, number>();

/**
 * Estado para una ventana. El overlay no recibe la Crónica ni los ajustes de escritorio; el
 * panel recibe la Crónica solo cuando cambia.
 */
function snapshot(target?: Electron.WebContents): Snapshot {
  const base = baseBounds();
  const isOverlay = !!overlay && !overlay.isDestroyed() && target === overlay.webContents;
  const chronicleLen = game.save.chronicle.length;
  const omit = isOverlay || (!!target && sentChronicle.get(target) === chronicleLen);
  if (target && !isOverlay) sentChronicle.set(target, chronicleLen);
  return {
    save: omit ? { ...game.save, chronicle: [] } : game.save,
    chronicleOmitted: omit,
    speed: game.speed,
    overlay: { layout: cfg.layout, fps: cfg.fps, bandHeight: base.height, bandWidth: base.width, expanded, cardsSide, faded },
    desktop: isOverlay ? undefined : desktopSettings(),
  };
}

/**
 * Envía el estado solo a las ventanas visibles: oculto no se dibuja, pero la simulación sigue.
 * Se llama tras cada cambio; el bucle decide además cada cuánto se refresca (más en pausa).
 */
function broadcast(): void {
  lastBroadcast = Date.now();
  for (const w of [overlay, panel]) {
    if (w && !w.isDestroyed() && w.isVisible() && !w.isMinimized()) w.webContents.send('state', snapshot(w.webContents));
  }
}

// ---------- ventanas ----------

function page(name: string): string {
  return path.join(__dirname, '..', 'dist', name);
}

/** Rectángulo del overlay: el de la disposición y, si hay cartas desplegadas, el espacio extra para ellas. */
function overlayBounds(): Rectangle {
  const base = baseBounds();
  if (!expanded) return base;
  const d = screen.getDisplayMatching(base).workArea;
  cardsSide = base.y - CARDS_HEIGHT >= d.y ? 'above' : 'below';
  const width = Math.max(base.width, Math.min(CARDS_MIN_WIDTH, d.width));
  // Se ancla el borde derecho de la franja (el contenido se alinea a la derecha).
  const x = Math.max(d.x, base.x + base.width - width);
  return { x, y: cardsSide === 'above' ? base.y - CARDS_HEIGHT : base.y, width, height: base.height + CARDS_HEIGHT };
}

function setExpanded(open: boolean): void {
  open = open && !!game.day.pendingCrossroads;
  if (open && (!overlay || overlay.isDestroyed() || !overlay.isVisible())) {
    openPanel(); // sin overlay a la vista, las cartas se eligen en el panel completo
    return;
  }
  if (expanded === open) return;
  expanded = open;
  applyLayout();
}

/** Abre la Encrucijada pendiente: en el overlay si está visible; si no, en el panel. */
function openCrossroads(): void {
  if (game.day.pendingCrossroads) setExpanded(true);
}

/** Monitor elegido para el overlay; si ya no está conectado, el principal. */
function targetDisplay(): Electron.Display {
  const all = screen.getAllDisplays();
  return all.find((d) => d.id === cfg.displayId) ?? screen.getPrimaryDisplay();
}

function displayList(): { id: number; nombre: string }[] {
  // Se nombran por su posición: con escalados raros la resolución en DIP sale como «1601×902».
  const primary = screen.getPrimaryDisplay().id;
  const all = screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y);
  const side = (i: number) => (all.length === 2 ? (i === 0 ? 'izquierda' : 'derecha') : `${i + 1}.º desde la izquierda`);
  return all.map((d, i) => ({ id: d.id, nombre: `Monitor ${side(i)}${d.id === primary ? ' (principal)' : ''}` }));
}

function baseBounds(): Rectangle {
  const wa = targetDisplay().workArea;
  const h = cfg.stripHeight;
  const clamp = (pos: { x: number; y: number } | null, size: { width: number; height: number }, def: { x: number; y: number }) => {
    const p = pos ?? def;
    const d = screen.getDisplayMatching({ ...p, ...size }).workArea;
    return {
      x: Math.round(Math.min(Math.max(p.x, d.x), d.x + d.width - size.width)),
      y: Math.round(Math.min(Math.max(p.y, d.y), d.y + d.height - size.height)),
      ...size,
    };
  };
  switch (cfg.layout) {
    case 'top':
      return { x: wa.x, y: wa.y, width: wa.width, height: h };
    case 'float': {
      const k = h / 110;
      const size = { width: Math.round(FLOAT_SIZE.width * k), height: Math.round(FLOAT_SIZE.height * k) };
      return clamp(cfg.floatPos, size, { x: wa.x + wa.width - size.width - 24, y: wa.y + wa.height - size.height - 24 });
    }
    case 'mini':
      return clamp(cfg.miniPos, MINI_SIZE, { x: wa.x + wa.width - MINI_SIZE.width - 24, y: wa.y + 24 });
    default:
      // Franja inferior, pegada encima de la barra de tareas.
      return { x: wa.x, y: wa.y + wa.height - h, width: wa.width, height: h };
  }
}

function createOverlay(): void {
  overlay = new BrowserWindow({
    ...overlayBounds(),
    show: false,
    frame: false,
    thickFrame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false, // nunca roba el foco del teclado
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
    },
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  setCaptured(false, true); // click-through
  void overlay.loadFile(page('overlay.html'));
  overlay.once('ready-to-show', () => {
    applyLayout(); // Windows agranda las ventanas transparentes al crearlas: se reajusta antes de mostrar
    syncOverlayVisibility();
  });
  // Al recargar el renderer, sus controles ya no están donde estaban (y un arrastre a medias se corta).
  overlay.webContents.on('did-start-loading', () => {
    stopDrag();
    hitRects = [];
    setCaptured(false);
  });
  // Apagar o cerrar sesión en Windows no emite before-quit: se guarda aquí.
  overlay.on('session-end', saveNow);
  // Si el renderer se cuelga, se recarga (y si falla una y otra vez, se recrea la ventana).
  overlay.webContents.on('render-process-gone', (_e, details) => {
    if (details.reason === 'clean-exit') return;
    recoverRenderer('overlay', details.reason);
  });
  overlay.on('unresponsive', () => recoverRenderer('overlay', 'unresponsive'));
  const win = overlay;
  win.on('closed', () => {
    if (overlay === win) overlay = null; // al recrearla, no se borra la nueva
  });
}

/** Cuelgues recientes de cada ventana, para no entrar en un bucle de recargas. */
const crashTimes: Record<'overlay' | 'panel', number[]> = { overlay: [], panel: [] };

function recoverRenderer(which: 'overlay' | 'panel', reason: string): void {
  const win = which === 'overlay' ? overlay : panel;
  if (!win || win.isDestroyed()) return;
  const now = Date.now();
  const recent = (crashTimes[which] = crashTimes[which].filter((t) => now - t < 60_000));
  recent.push(now);
  console.warn(`El ${which} dejó de responder (${reason}); intento ${recent.length}.`);
  if (which === 'overlay') {
    stopDrag();
    hitRects = [];
    setCaptured(false);
  }
  if (recent.length <= 3) {
    win.webContents.reload();
  } else if (which === 'overlay' && recent.length === 4) {
    // Se recrea la ventana entera; si vuelve a fallar en el mismo minuto, se deja oculta.
    overlay = null;
    win.destroy();
    createOverlay();
  } else if (which === 'overlay') {
    overlayDisabledByCrash = true;
    win.hide();
    notify('La Jornada', 'El overlay falló varias veces y lo oculté. Puedes volver a mostrarlo desde la bandeja.');
    refreshTray();
  }
}

function saveNow(): void {
  try {
    game.step();
    game.persist();
  } catch (e) {
    console.error('No se pudo guardar al cerrar la sesión', e);
  }
}

function stopDrag(): void {
  if (dragTimer) clearInterval(dragTimer);
  dragTimer = null;
}

function applyLayout(): void {
  if (!overlay || overlay.isDestroyed()) return;
  overlay.setBounds(overlayBounds());
  overlay.setOpacity(cfg.opacity);
  updateClickThrough();
  broadcast();
}

// ---------- click-through ----------
// El overlay deja pasar los clics salvo cuando el cursor está sobre uno de sus controles.
// Se decide aquí, mirando la posición del cursor, y no en el renderer con mouseenter/mouseleave:
// los eventos reenviados por Electron entran en bucle al cambiar el modo y dejan de llegar
// tras ocultar y mostrar la ventana.

interface HitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Sondeo del cursor: rápido cerca del overlay, lento lejos. */
const HIT_POLL_MS = 33;
const HIT_POLL_FAR_MS = 150;
const HIT_NEAR_PX = 120;
let hitRects: HitRect[] = [];
/** true: el overlay recibe los clics (el cursor está sobre un control o se arrastra). */
let captured = false;

function setCaptured(on: boolean, force = false): void {
  if (!overlay || overlay.isDestroyed() || (on === captured && !force)) return;
  captured = on;
  // «forward» es imprescindible aunque el cursor se vigile aquí: sin él, Chromium descarta los
  // clics en esta ventana transparente que no toma el foco (probado con ratón real en Windows).
  // El renderer no usa los eventos reenviados para decidir nada (eso causaba un bucle).
  // Contrapartida: en Windows instala un gancho global de ratón en este hilo, así que aquí no
  // se debe hacer trabajo pesado (por eso la bandeja, el registro y los ajustes van con caché).
  overlay.setIgnoreMouseEvents(!on, { forward: true });
  overlay.webContents.send('overlay:pointer', on); // para los estilos :hover
}

/** Devuelve la distancia aproximada (px) del cursor al overlay, o Infinity si no está visible. */
function updateClickThrough(): number {
  if (!overlay || overlay.isDestroyed()) return Infinity;
  if (dragTimer) {
    setCaptured(true);
    return 0;
  }
  if (!overlay.isVisible()) {
    setCaptured(false);
    return Infinity;
  }
  const p = screen.getCursorScreenPoint();
  const b = overlay.getBounds();
  const x = p.x - b.x;
  const y = p.y - b.y;
  const inWindow = x >= 0 && y >= 0 && x < b.width && y < b.height;
  setCaptured(inWindow && hitRects.some((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h));
  return Math.max(0, -x, x - b.width, -y, y - b.height);
}

function pollClickThrough(): void {
  let dist = Infinity;
  try {
    dist = updateClickThrough();
  } catch (e) {
    console.error('Error al vigilar el cursor', e);
  }
  setTimeout(pollClickThrough, dist <= HIT_NEAR_PX ? HIT_POLL_MS : HIT_POLL_FAR_MS);
}

function setLayout(layout: OverlayLayout): void {
  cfg.layout = layout;
  saveConfig(userDir, cfg);
  applyLayout();
  refreshTray();
}

function setStripHeight(height: number): void {
  cfg.stripHeight = height;
  saveConfig(userDir, cfg);
  applyLayout();
  refreshTray();
}

function cycleSize(dir: 1 | -1): void {
  const i = SIZE_PRESETS.findIndex((p) => p.height === cfg.stripHeight);
  const next = Math.min(SIZE_PRESETS.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir));
  setStripHeight(SIZE_PRESETS[next].height);
}

function setOverlayVisible(visible: boolean): void {
  cfg.overlayVisible = visible;
  if (visible && overlayDisabledByCrash) {
    // Se ocultó tras fallar varias veces: el usuario lo pide, así que se recrea de cero.
    overlayDisabledByCrash = false;
    crashTimes.overlay = [];
    const old = overlay;
    overlay = null;
    if (old && !old.isDestroyed()) old.destroy();
  }
  saveConfig(userDir, cfg);
  if (!overlay || overlay.isDestroyed()) createOverlay();
  else syncOverlayVisibility();
  refreshTray();
}

function openPanel(): void {
  if (panel && !panel.isDestroyed()) {
    if (panel.isMinimized()) panel.restore();
    panel.show();
    panel.focus();
    return;
  }
  panel = new BrowserWindow({
    width: 1100,
    height: 820,
    title: 'La Jornada',
    autoHideMenuBar: true,
    backgroundColor: '#07090f',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  void panel.loadFile(page('index.html'), DEBUG_UI ? { query: { debug: '1' } } : undefined);
  panel.webContents.on('render-process-gone', (_e, details) => {
    if (details.reason !== 'clean-exit') recoverRenderer('panel', details.reason);
  });
  panel.on('session-end', saveNow);
  panel.on('closed', () => (panel = null));
}

function toggleWork(): void {
  if (game.day.pendingCrossroads?.tipo === 'origen') openCrossroads();
  else game.toggle();
  broadcast();
  refreshTray();
}

// ---------- IPC ----------

function wireIpc(): void {
  ipcMain.handle('get-state', (e) => {
    sentChronicle.delete(e.sender); // la ventana empieza de cero: necesita la Crónica
    return snapshot(e.sender);
  });

  ipcMain.handle('cmd', (e, name: Command, args: unknown[]) => {
    const [a] = args;
    switch (name) {
      case 'toggle':
        // Sin Origen elegido no se puede trabajar: se abre el panel con las cartas.
        if (game.day.pendingCrossroads?.tipo === 'origen') openCrossroads();
        else game.toggle();
        break;
      case 'setSetting':
        game.setSetting(a as keyof Settings, args[1] as never);
        break;
      case 'chooseCard':
        game.chooseCard(Number(a));
        break;
      case 'forceCrossroads':
        game.forceCrossroads();
        break;
      case 'startDay':
        game.startDay();
        break;
      case 'openPanel':
        openPanel();
        break;
      case 'setDesktop':
        setDesktop(a as keyof DesktopSettings, args[1]);
        break;
      case 'setShortcut':
        setShortcut(a as ShortcutId, String(args[1] ?? ''));
        break;
      case 'pauseShortcuts':
        pauseShortcuts(!!a);
        break;
      // debug
      case 'setSpeed':
        game.setSpeed(Number(a));
        break;
      case 'resetDay':
        game.resetDay(typeof a === 'number' ? a : undefined);
        break;
      case 'jumpToHour':
        game.jumpToHour(Number(a));
        break;
      case 'shiftDate':
        game.shiftDate(a === null ? null : Number(a));
        break;
      case 'setCutoffHour':
        game.setCutoffHour(Number(a));
        break;
    }
    broadcast();
    refreshTray();
    return snapshot(e.sender);
  });

  // Click-through: el overlay informa de dónde están sus controles; el cursor se vigila aquí.
  ipcMain.on('overlay:hit-rects', (e, rects: HitRect[]) => {
    if (!overlay || e.sender !== overlay.webContents || !Array.isArray(rects)) return;
    hitRects = rects.filter((r) => [r.x, r.y, r.w, r.h].every(Number.isFinite)).slice(0, 32);
    updateClickThrough();
  });

  ipcMain.on('overlay:expand', (e, open: boolean) => {
    if (overlay && e.sender === overlay.webContents) setExpanded(open);
  });

  // Arrastre manual con el asa (ventana flotante y mínimo).
  ipcMain.on('overlay:drag', (e, active: boolean) => {
    if (!overlay || e.sender !== overlay.webContents) return;
    stopDrag();
    const key = cfg.layout === 'float' ? 'floatPos' : cfg.layout === 'mini' ? 'miniPos' : null;
    if (!key || expanded) return;
    if (active) {
      const start = screen.getCursorScreenPoint();
      const [wx, wy] = overlay.getPosition();
      const size = overlay.getBounds();
      dragTimer = setInterval(() => {
        if (!overlay || overlay.isDestroyed()) return;
        const p = screen.getCursorScreenPoint();
        // setBounds (no setPosition) para que el tamaño no derive con escalas de pantalla ≠ 100 %.
        overlay.setBounds({ x: wx + p.x - start.x, y: wy + p.y - start.y, width: size.width, height: size.height });
      }, 16);
    } else {
      const [x, y] = overlay.getPosition();
      cfg[key] = { x, y };
      saveConfig(userDir, cfg);
      applyLayout();
      syncOverlayVisibility(); // puede haber cambiado de monitor
    }
  });
}

// ---------- bandeja del sistema ----------

function createTray(): void {
  tray = new Tray(trayIcon(false));
  tray.on('double-click', openPanel);
  refreshTray();
}

let trayKey = '';

function refreshTray(): void {
  if (!tray) return;
  const running = game.day.status === 'RUNNING';
  const autoStart = getAutoStart();
  const displays = displayList();
  // El menú solo se reconstruye si cambió algo de lo que muestra.
  const key = JSON.stringify([running, cfg.overlayVisible, overlayDisabledByCrash, cfg.layout, cfg.stripHeight, cfg.displayId, displays, autoStart, cfg.fadeOnHover, cfg.hideOnFullscreen, activeShortcuts]);
  if (key === trayKey) return;
  trayKey = key;
  if (running !== trayRunning) tray.setImage(trayIcon(running));
  trayRunning = running;
  tray.setToolTip(`La Jornada · ${running ? 'trabajando' : 'en pausa'}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: (running ? '⏸ Pausa' : '▶ Trabajar') + hint('toggleWork'), click: toggleWork },
      {
        label: (cfg.overlayVisible ? 'Ocultar overlay' : 'Mostrar overlay') + hint('toggleOverlay'),
        click: () => setOverlayVisible(!cfg.overlayVisible),
      },
      {
        label: 'Cambiar disposición',
        submenu: LAYOUTS.map((l) => ({
          label: l.nombre,
          type: 'radio' as const,
          checked: cfg.layout === l.id,
          click: () => setLayout(l.id),
        })),
      },
      ...(displays.length > 1
        ? [
            {
              label: 'Monitor',
              submenu: displays.map((d) => ({
                label: d.nombre,
                type: 'radio' as const,
                checked: targetDisplay().id === d.id,
                click: () => setDesktop('displayId', d.id),
              })),
            },
          ]
        : []),
      {
        label: 'Tamaño',
        submenu: SIZE_PRESETS.map((p) => ({
          label: `${p.nombre} (${p.height} px)`,
          type: 'radio' as const,
          checked: cfg.stripHeight === p.height,
          click: () => setStripHeight(p.height),
        })),
      },
      { label: 'Abrir panel completo' + hint('openPanel'), click: openPanel },
      {
        label: 'Ajustes',
        submenu: [
          {
            label: 'Iniciar con Windows',
            type: 'checkbox',
            checked: autoStart,
            click: (item) => setAutoStart(item.checked),
          },
          { label: 'Desvanecer al pasar el mouse', type: 'checkbox', checked: cfg.fadeOnHover, click: (item) => setDesktop('fadeOnHover', item.checked) },
          { label: 'Ocultar en pantalla completa', type: 'checkbox', checked: cfg.hideOnFullscreen, click: (item) => setDesktop('hideOnFullscreen', item.checked) },
          { type: 'separator' },
          { label: 'Todos los ajustes…', click: openPanel },
        ],
      },
      { type: 'separator' },
      { label: 'Salir', click: () => app.quit() },
    ]),
  );
}

// ---------- atajos globales ----------

const SHORTCUT_ACTIONS: Record<ShortcutId, () => void> = {
  toggleWork: () => toggleWork(),
  toggleOverlay: () => setOverlayVisible(!cfg.overlayVisible),
  openPanel: () => openPanel(),
  openCrossroads: () => openCrossroads(),
  sizeUp: () => cycleSize(1),
  sizeDown: () => cycleSize(-1),
};

/**
 * Registra el atajo de una acción. Si es el de por defecto y otra app lo ocupa, se prueban las
 * alternativas; uno elegido por el usuario no se sustituye ("" = sin atajo).
 */
function registerShortcut(id: ShortcutId): void {
  const prev = activeShortcuts[id];
  if (prev) globalShortcut.unregister(prev);
  delete activeShortcuts[id];
  const wanted = cfg.shortcuts[id];
  if (!wanted || shortcutsPaused) return;
  const candidates = wanted === DEFAULT_SHORTCUTS[id] ? [wanted, ...(SHORTCUT_FALLBACKS[id] ?? [])] : [wanted];
  for (const accel of candidates) {
    let ok = false;
    try {
      ok = globalShortcut.register(accel, SHORTCUT_ACTIONS[id]);
    } catch {
      ok = false;
    }
    if (ok) {
      activeShortcuts[id] = accel;
      return;
    }
    console.warn(`No se pudo registrar el atajo ${id} (${accel}): ya está en uso`);
  }
}

function registerShortcuts(): void {
  for (const id of Object.keys(SHORTCUT_ACTIONS) as ShortcutId[]) registerShortcut(id);
  refreshTray();
}

function shortcutInfo(): Record<ShortcutId, ShortcutInfo> {
  const out = {} as Record<ShortcutId, ShortcutInfo>;
  for (const id of Object.keys(SHORTCUT_ACTIONS) as ShortcutId[]) {
    const configurado = cfg.shortcuts[id];
    const activo = activeShortcuts[id] ?? '';
    out[id] = {
      configurado,
      activo,
      estado: !configurado ? 'sin atajo' : !activo ? (shortcutsPaused ? 'ok' : 'ocupado') : activo === configurado ? 'ok' : 'alternativa',
    };
  }
  return out;
}

/** Cambia el atajo de una acción desde Ajustes ("" lo quita). Si está ocupado, queda indicado. */
function setShortcut(id: ShortcutId, accel: string): void {
  if (!(id in SHORTCUT_ACTIONS)) return;
  const clean = accel.trim();
  // La misma combinación no puede hacer dos cosas: se quita de la otra acción.
  for (const other of Object.keys(SHORTCUT_ACTIONS) as ShortcutId[]) {
    if (other !== id && clean && cfg.shortcuts[other] === clean) {
      cfg.shortcuts[other] = '';
      registerShortcut(other);
    }
  }
  cfg.shortcuts[id] = clean;
  saveConfig(userDir, cfg);
  registerShortcut(id);
  refreshTray();
}

/** Mientras Ajustes graba una combinación nueva, los atajos globales no deben dispararse. */
function pauseShortcuts(paused: boolean): void {
  if (shortcutsPaused === paused) return;
  shortcutsPaused = paused;
  if (paused) {
    for (const accel of Object.values(activeShortcuts)) if (accel) globalShortcut.unregister(accel);
    for (const id of Object.keys(activeShortcuts) as ShortcutId[]) delete activeShortcuts[id];
  } else registerShortcuts();
}

// ---------- inicio con Windows ----------

function loginItem(): { path: string; args: string[] } {
  // Portable: el .exe real es el que el usuario abrió, no el extraído en la carpeta temporal.
  const exe = process.env.PORTABLE_EXECUTABLE_FILE ?? process.execPath;
  return { path: exe, args: DEV ? [app.getAppPath()] : [] };
}

let autoStartAt = 0;

/**
 * ¿Windows arrancará La Jornada al iniciar sesión? (Si se desactivó en el Administrador de
 * tareas, la entrada sigue pedida pero no arranca.) Se lee del registro como mucho cada 30 s.
 */
function getAutoStart(): boolean {
  if (autoStartCache === null || Date.now() - autoStartAt > 30_000) {
    const s = app.getLoginItemSettings(loginItem());
    autoStartCache = s.openAtLogin && s.executableWillLaunchAtLogin !== false;
    autoStartAt = Date.now();
  }
  return autoStartCache;
}

function setAutoStart(enabled: boolean): void {
  // enabled: true reactiva la entrada aunque se hubiera desactivado en el Administrador de tareas.
  app.setLoginItemSettings({ openAtLogin: enabled, enabled, ...loginItem() });
  autoStartCache = null;
  refreshTray();
}
