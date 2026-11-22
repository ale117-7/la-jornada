// Pantalla de ajustes: jornada (hora de corte, huecos) y, en escritorio, overlay, sistema y atajos.
// Los ajustes de Encrucijadas (auto-elegir, sonido, avisos) los conecta crossroadsUi.
import type { DesktopSettings, GameApi, ShortcutId, ShortcutInfo } from '../core/api';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const SHORTCUT_NAMES: [ShortcutId, string][] = [
  ['toggleWork', 'Trabajar / Pausa'],
  ['openCrossroads', 'Abrir la Encrucijada pendiente'],
  ['toggleOverlay', 'Mostrar / ocultar el overlay'],
  ['openPanel', 'Abrir este panel'],
  ['sizeUp', 'Overlay más grande'],
  ['sizeDown', 'Overlay más pequeño'],
];

/** Acelerador de Electron → texto para el usuario. */
export const keyName = (accel: string) =>
  accel
    .split('+')
    .map((k) => ({ Control: 'Ctrl', CommandOrControl: 'Ctrl', Space: 'Espacio', Up: '↑', Down: '↓', Left: '←', Right: '→', Super: 'Win', Delete: 'Supr', Insert: 'Insert', PageUp: 'RePág', PageDown: 'AvPág', Home: 'Inicio', End: 'Fin' })[k] ?? k)
    .join(' + ');

/** Tecla del evento → nombre de tecla de un acelerador de Electron (o null si no se admite). */
function accelKey(e: KeyboardEvent): string | null {
  const c = e.code;
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);
  if (/^Digit[0-9]$/.test(c)) return c.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(c)) return c;
  if (/^Numpad[0-9]$/.test(c)) return `num${c.slice(6)}`;
  const map: Record<string, string> = {
    Space: 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert', Delete: 'Delete',
  };
  return map[c] ?? null;
}

export function setupSettingsUi(game: GameApi): () => void {
  const modal = $('settings');
  $('btn-settings').addEventListener('click', () => (modal.hidden = false));
  modal.addEventListener('click', (e) => {
    if (e.target === modal || (e.target as HTMLElement).closest('[data-close]')) {
      stopCapture();
      modal.hidden = true;
    }
  });

  // ----- jornada -----
  const cutoff = $<HTMLSelectElement>('set-cutoff');
  cutoff.innerHTML = Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, '0')}:00</option>`).join('');
  cutoff.addEventListener('change', () => game.setCutoffHour(Number(cutoff.value)));
  const gap = $<HTMLSelectElement>('set-gap');
  gap.addEventListener('change', () => game.setSetting('gapThresholdMs', Number(gap.value) * 60_000));

  // ----- escritorio -----
  const desk = $('set-desktop');
  const set = <K extends keyof DesktopSettings>(key: K, value: DesktopSettings[K]) => game.setDesktop?.(key, value);
  const check = (id: string, key: 'overlayVisible' | 'fadeOnHover' | 'hideOnFullscreen' | 'autoStart') => {
    const el = $<HTMLInputElement>(id);
    el.addEventListener('change', () => set(key, el.checked));
    return el;
  };
  const select = (id: string, key: 'stripHeight' | 'fps' | 'idlePauseMin') => {
    const el = $<HTMLSelectElement>(id);
    el.addEventListener('change', () => set(key, Number(el.value)));
    return el;
  };
  const visible = check('set-ov-visible', 'overlayVisible');
  const fade = check('set-ov-fade', 'fadeOnHover');
  const full = check('set-ov-fullscreen', 'hideOnFullscreen');
  const autostart = check('set-autostart', 'autoStart');
  const size = select('set-ov-size', 'stripHeight');
  const fps = select('set-ov-fps', 'fps');
  const idle = select('set-idle', 'idlePauseMin');
  const display = $<HTMLSelectElement>('set-ov-display');
  display.addEventListener('change', () => set('displayId', display.value === 'null' ? null : Number(display.value)));
  let lastDisplays = '';
  const layout = $<HTMLSelectElement>('set-ov-layout');
  layout.addEventListener('change', () => set('layout', layout.value as DesktopSettings['layout']));
  // Opacidad: la etiqueta sigue al deslizador; el valor se aplica al soltarlo (no en cada píxel).
  const opacity = $<HTMLInputElement>('set-ov-opacity');
  const opacityVal = $('set-ov-opacity-val');
  opacity.addEventListener('input', () => (opacityVal.textContent = `${opacity.value} %`));
  opacity.addEventListener('change', () => set('opacity', Number(opacity.value) / 100));
  const fullNote = $('set-ov-fullscreen-note');

  /** No se pisa el control que el usuario está tocando en este momento. */
  const sync = (el: HTMLInputElement | HTMLSelectElement, value: string | boolean) => {
    if (document.activeElement === el) return;
    if (typeof value === 'boolean') (el as HTMLInputElement).checked = value;
    else el.value = value;
  };

  // ----- atajos: se graban pulsando la combinación -----
  const scBox = $('set-shortcuts');
  const scMsg = $('set-shortcut-msg');
  let capturing: ShortcutId | null = null;
  let lastShortcuts = '';

  function stopCapture(): void {
    if (!capturing) return;
    capturing = null;
    window.removeEventListener('keydown', onCaptureKey, true);
    game.pauseShortcuts?.(false);
    lastShortcuts = ''; // repintar
  }

  function onCaptureKey(e: KeyboardEvent): void {
    if (!capturing) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      scMsg.textContent = '';
      stopCapture();
      return;
    }
    if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(e.key)) return; // aún faltan teclas
    const key = accelKey(e);
    if (!key) {
      scMsg.textContent = 'Esa tecla no se puede usar en un atajo. Prueba con una letra, un número, una tecla F o las flechas.';
      return;
    }
    const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super'].filter(Boolean) as string[];
    // Sin Ctrl ni Alt (salvo teclas F) el atajo se comería teclas normales en todas las aplicaciones.
    if (!e.ctrlKey && !e.altKey && !/^F\d+$/.test(key)) {
      scMsg.textContent = 'Incluye Ctrl o Alt (por ejemplo, Ctrl + Alt + J): si no, esa tecla dejaría de funcionar en las demás aplicaciones.';
      return;
    }
    const accel = [...mods, key].join('+');
    const id = capturing;
    scMsg.textContent =
      e.ctrlKey && e.altKey && /^[A-Z]$/.test(key) && !e.shiftKey
        ? `Ojo: Ctrl + Alt equivale a AltGr. Si con AltGr + ${key} escribes algún carácter, ya no podrás escribirlo.`
        : '';
    stopCapture();
    game.setShortcut?.(id, accel);
  }

  scBox.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-sc]');
    if (!btn) return;
    const id = btn.dataset.sc as ShortcutId;
    if (btn.dataset.act === 'quitar') {
      stopCapture();
      game.setShortcut?.(id, '');
      return;
    }
    if (capturing === id) {
      stopCapture();
      return;
    }
    stopCapture();
    capturing = id;
    scMsg.textContent = '';
    game.pauseShortcuts?.(true);
    window.addEventListener('keydown', onCaptureKey, true);
    lastShortcuts = '';
  });
  window.addEventListener('blur', stopCapture);

  function shortcutRow(id: ShortcutId, name: string, info: ShortcutInfo | undefined): string {
    const grabando = capturing === id;
    const shown = info?.activo || info?.configurado || '';
    const estado = !info
      ? ''
      : info.estado === 'alternativa'
        ? `<small class="warn">${keyName(info.configurado)} estaba ocupado: se usa esta</small>`
        : info.estado === 'ocupado'
          ? '<small class="warn">ocupado por otra aplicación</small>'
          : '';
    const kbd = grabando ? '<kbd class="rec">pulsa la combinación… (Esc cancela)</kbd>' : shown ? `<kbd>${keyName(shown)}</kbd>` : '<span class="dim">sin atajo</span>';
    return `<div class="set-row sc-row"><span>${name}${estado ? `<br>${estado}` : ''}</span><span class="sc-keys">${kbd}
      <button type="button" class="sc-btn" data-sc="${id}" data-act="cambiar">${grabando ? 'Cancelar' : 'Cambiar'}</button>
      ${info?.configurado && !grabando ? `<button type="button" class="sc-btn" data-sc="${id}" data-act="quitar" title="Quitar el atajo">✕</button>` : ''}</span></div>`;
  }

  return () => {
    if (modal.hidden) {
      stopCapture();
      return;
    }
    const st = game.save.settings;
    sync(cutoff, String(st.cutoffHour));
    sync(gap, String(Math.round(st.gapThresholdMs / 60_000)));
    const d = game.desktop;
    desk.hidden = !d;
    if (!d) return;
    sync(visible, d.overlayVisible);
    sync(fade, d.fadeOnHover);
    sync(full, d.hideOnFullscreen);
    fullNote.hidden = d.fullscreenAvailable || !d.hideOnFullscreen;
    sync(autostart, d.autoStart);
    const opts = `<option value="null">Principal</option>${d.displays.map((x) => `<option value="${x.id}">${x.nombre}</option>`).join('')}`;
    if (opts !== lastDisplays) display.innerHTML = lastDisplays = opts;
    $('set-ov-display-row').hidden = d.displays.length < 2;
    sync(display, String(d.displayId));
    sync(layout, d.layout);
    // Un alto arrastrado a mano no coincide con ningún tamaño predefinido: se muestra el más cercano.
    const sizes = [...size.options].map((o) => Number(o.value));
    sync(size, String(sizes.reduce((a, b) => (Math.abs(b - d.stripHeight) < Math.abs(a - d.stripHeight) ? b : a))));
    sync(fps, String(d.fps));
    sync(idle, String(d.idlePauseMin));
    sync(opacity, String(Math.round(d.opacity * 100)));
    if (document.activeElement !== opacity) opacityVal.textContent = `${Math.round(d.opacity * 100)} %`;
    const sc = SHORTCUT_NAMES.map(([id, name]) => shortcutRow(id, name, d.shortcuts[id])).join('');
    if (sc !== lastShortcuts) scBox.innerHTML = lastShortcuts = sc;
  };
}
