// Preferencias de la carcasa de escritorio (no forman parte de la partida).
// Se validan campo a campo al cargar y se escriben de forma atómica.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { OverlayLayout, ShortcutId } from '../src/core/api';

export const SIZE_PRESETS = [
  { nombre: 'Delgada', height: 70 },
  { nombre: 'Normal', height: 110 },
  { nombre: 'Grande', height: 180 },
  { nombre: 'Cine', height: 260 },
];

export const LAYOUTS: { id: OverlayLayout; nombre: string }[] = [
  { id: 'bottom', nombre: 'Franja inferior' },
  { id: 'top', nombre: 'Franja superior' },
  { id: 'float', nombre: 'Ventana flotante' },
  { id: 'mini', nombre: 'Mínimo' },
];

export interface DesktopConfig {
  /** Versión del formato de este archivo (para migrar valores por defecto viejos). */
  configVersion: number;
  layout: OverlayLayout;
  /** Alto de la franja en px (tamaño predefinido). La ventana flotante escala con él. */
  stripHeight: number;
  overlayVisible: boolean;
  fps: number;
  /** Monitor del overlay (id de Electron); null = el principal. */
  displayId: number | null;
  /** Opacidad del overlay (0.2–1). */
  opacity: number;
  fadeOnHover: boolean;
  hideOnFullscreen: boolean;
  /** Pausa automática por inactividad, en minutos (0 = desactivada). */
  idlePauseMin: number;
  floatPos: { x: number; y: number } | null;
  miniPos: { x: number; y: number } | null;
  /**
   * Atajos globales (formato de aceleradores de Electron). Se cambian desde Ajustes.
   * "" = sin atajo. Solo se prueban alternativas si el atajo es el de por defecto.
   */
  shortcuts: Record<ShortcutId, string>;
}

export const CONFIG_VERSION = 2;

/**
 * Atajos por defecto. Se evitan las combinaciones que Windows también produce con AltGr
 * (AltGr = Ctrl+Alt) en distribuciones comunes: AltGr+E es «€» (España, Alemania, Francia…),
 * AltGr+Q es «@» (Latinoamérica, Alemania) y AltGr+vocal da tildes en EE. UU. internacional
 * (H y J no producen nada con AltGr en ninguna de ellas).
 * Ctrl+Alt+↑/↓ chocan con VS Code y con la rotación de pantalla de algunos drivers: el tamaño
 * no tiene atajo por defecto (se cambia desde la bandeja o Ajustes).
 */
export const DEFAULT_SHORTCUTS: Record<ShortcutId, string> = {
  toggleWork: 'Control+Alt+Space',
  toggleOverlay: 'Control+Alt+H',
  openPanel: 'Control+Alt+J',
  openCrossroads: 'Control+Alt+Shift+E',
  sizeUp: '',
  sizeDown: '',
};

/** Alternativas si otra aplicación ya ocupa el atajo por defecto. */
export const SHORTCUT_FALLBACKS: Partial<Record<ShortcutId, string[]>> = {
  toggleWork: ['Control+Alt+Shift+Space', 'Control+Alt+P'],
  toggleOverlay: ['Control+Alt+Shift+O', 'Control+Alt+Shift+H'],
  openPanel: ['Control+Alt+Shift+J'],
};

/** Valores por defecto de la versión 1, que se sustituyen al migrar si el usuario no los cambió. */
const V1_SHORTCUTS: Record<ShortcutId, string> = {
  toggleWork: 'Control+Alt+Space',
  toggleOverlay: 'Control+Alt+O',
  openPanel: 'Control+Alt+J',
  openCrossroads: 'Control+Alt+E',
  sizeUp: 'Control+Alt+Up',
  sizeDown: 'Control+Alt+Down',
};

const DEFAULTS: DesktopConfig = {
  configVersion: CONFIG_VERSION,
  layout: 'bottom',
  stripHeight: 110,
  overlayVisible: true,
  fps: 30,
  displayId: null,
  opacity: 1,
  fadeOnHover: false,
  hideOnFullscreen: true,
  idlePauseMin: 0,
  floatPos: null,
  miniPos: null,
  shortcuts: { ...DEFAULT_SHORTCUTS },
};

const fileIn = (dir: string) => path.join(dir, 'overlay-config.json');

const num = (v: unknown, min: number, max: number, def: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);
const pos = (v: unknown) => {
  const p = v as { x?: unknown; y?: unknown } | null;
  return p && typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: Math.round(p.x), y: Math.round(p.y) } : null;
};

/** Corrige un archivo leído: cualquier campo inválido vuelve a su valor por defecto. */
function sanitize(raw: Record<string, unknown>): DesktopConfig {
  const d = DEFAULTS;
  const version = typeof raw.configVersion === 'number' ? raw.configVersion : 1;
  const sc = (raw.shortcuts ?? {}) as Record<string, unknown>;
  const shortcuts = { ...d.shortcuts };
  for (const id of Object.keys(d.shortcuts) as ShortcutId[]) {
    const v = sc[id];
    if (typeof v !== 'string') continue;
    // Versión 1: los atajos por defecto viejos (que chocaban con AltGr) pasan a los nuevos.
    if (version < 2 && v === V1_SHORTCUTS[id]) continue;
    shortcuts[id] = v.trim();
  }
  return {
    configVersion: CONFIG_VERSION,
    layout: LAYOUTS.some((l) => l.id === raw.layout) ? (raw.layout as OverlayLayout) : d.layout,
    stripHeight: Math.round(num(raw.stripHeight, 60, 300, d.stripHeight)),
    overlayVisible: bool(raw.overlayVisible, d.overlayVisible),
    fps: raw.fps === 15 ? 15 : 30,
    displayId: typeof raw.displayId === 'number' && Number.isFinite(raw.displayId) ? raw.displayId : null,
    opacity: num(raw.opacity, 0.2, 1, d.opacity),
    fadeOnHover: bool(raw.fadeOnHover, d.fadeOnHover),
    hideOnFullscreen: bool(raw.hideOnFullscreen, d.hideOnFullscreen),
    idlePauseMin: raw.idlePauseMin === 0 ? 0 : Math.round(num(raw.idlePauseMin, 5, 30, d.idlePauseMin)),
    floatPos: pos(raw.floatPos),
    miniPos: pos(raw.miniPos),
    shortcuts,
  };
}

export function loadConfig(dir: string): DesktopConfig {
  const file = fileIn(dir);
  if (!existsSync(file)) return structuredClone(DEFAULTS);
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('formato inesperado');
    return sanitize(raw as Record<string, unknown>);
  } catch (e) {
    // Archivo roto (p. ej., una coma de más al editarlo a mano): se aparta para no pisarlo.
    console.warn('overlay-config.json no se pudo leer; se guarda aparte y se usan los valores por defecto', e);
    try {
      renameSync(file, `${file}.bad-${Date.now()}`);
    } catch {
      /* si no se puede mover, se sobrescribirá */
    }
    return structuredClone(DEFAULTS);
  }
}

export function saveConfig(dir: string, cfg: DesktopConfig): void {
  const file = fileIn(dir);
  try {
    // Escritura atómica: un corte a mitad no deja el archivo truncado.
    writeFileSync(`${file}.tmp`, JSON.stringify(cfg, null, 2));
    renameSync(`${file}.tmp`, file);
  } catch (e) {
    console.warn('No se pudo guardar la configuración', e);
  }
}
