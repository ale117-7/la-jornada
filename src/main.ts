import './style.css';
import { formatHM, formatHMS, formatNumber, formatWorked } from './core/format';
import { heroStats, totalDps, upgradeCost } from './core/formulas';
import { golpeMundoMedio, hasMechanic } from './core/worldMods';
import type { GameApi } from './core/api';
import { Game } from './core/game';
import { RemoteGame } from './ui/remoteGame';
import { LocalStorageStore } from './core/save';
import { UPGRADES } from './data/upgrades';
import { Renderer } from './render/renderer';
import { CORRIENTES } from './data/tags';
import { presagioDelDia } from './data/omens';
import { setupBaseUi } from './ui/baseUi';
import { setupChronicleUi } from './ui/chronicleUi';
import { setupSettingsUi } from './ui/settingsUi';
import { setupCrossroadsUi } from './ui/crossroadsUi';
import { setupDebug } from './ui/debug';
import { setupWorldUi } from './ui/worldUi';

const AUTOSAVE_MS = 30_000;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// En escritorio (Electron) la simulación vive en el proceso principal y esta ventana solo la muestra.
const game: GameApi = window.jornada
  ? await RemoteGame.connect(window.jornada)
  : new Game(
      new LocalStorageStore(),
      () => Date.now(),
      () => crypto.getRandomValues(new Uint32Array(1))[0],
    );
const renderer = new Renderer($<HTMLCanvasElement>('runner'));

const debugOn = new URLSearchParams(location.search).get('debug') === '1';
const updateDebug = debugOn ? setupDebug($('debug'), game) : null;
if (debugOn) (window as unknown as { __game: GameApi }).__game = game;
// Depuración: avanza el dibujo `ms` milisegundos a mano (las pestañas ocultas apenas reciben
// frames). El reloj del dibujo sigue siendo monótono: los frames normales llevan el mismo desfase.
let drawOffset = 0;
let lastFrameT = 0;
if (debugOn) (window as unknown as { __advanceDraw: (ms: number) => void }).__advanceDraw = (ms) => {
  for (let k = 50; k <= ms; k += 50) renderer.draw(game.day, lastFrameT + drawOffset + k);
  drawOffset += ms;
};
const crossroadsUi = setupCrossroadsUi(game);
const refreshBase = setupBaseUi(game);
const refreshWorld = setupWorldUi(game);
const refreshChronicle = setupChronicleUi(game);
const refreshSettings = setupSettingsUi(game);

// ----- controles -----
const btn = $<HTMLButtonElement>('btn-toggle');
btn.addEventListener('click', () => {
  game.toggle();
  refreshUi();
});
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return;
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'BUTTON' || !game.day.introSeen) return;
  e.preventDefault();
  game.toggle();
  refreshUi();
});
$('btn-start-day').addEventListener('click', () => {
  game.startDay();
  refreshUi();
});

// ----- interfaz (DOM) -----
let lastLogKey = '';
function refreshUi(): void {
  const s = game.day;
  const running = s.status === 'RUNNING';
  btn.textContent = running ? '⏸ PAUSA' : '▶ TRABAJAR';
  btn.classList.toggle('running', running);
  // Frontera de Ruido: la interfaz se deforma (style.css).
  document.body.classList.toggle('glitch', hasMechanic(s, 'glitch'));
  const alert = crossroadsUi.pending() && s.introSeen ? '⚠ ¡Encrucijada! · ' : '';
  document.title = `${alert}${running ? '▶' : '⏸'} ${formatHM(s.workedMs)} · La Jornada`;
  $('clock').innerHTML = `Hoy: ${formatWorked(s.workedMs)} <small>${String(Math.floor(s.workedMs / 1000) % 60).padStart(2, '0')}s</small>`;
  const moneda = s.corriente ? CORRIENTES[s.corriente].moneda : 'Créditos';
  $('gold').textContent = `${moneda}: ${formatNumber(s.gold)}`;
  $('date-info').textContent = `Jornada ${s.dateKey} · Día ${game.save.chronicle.length + 1}`;

  const st = heroStats(s.upgrades, s.mods);
  const rows = UPGRADES.map((u) => {
    const lvl = s.upgrades[u.id] ?? 0;
    return `<tr><td>${u.nombre}</td><td class="num">nv ${lvl}</td><td class="dim">siguiente: ${formatNumber(upgradeCost(u, lvl) * s.mods.costeMejorasMult)}</td></tr>`;
  }).join('');
  $('hero-panel').innerHTML = `<table>
    <tr><td>Vida</td><td class="num">${formatNumber(Math.max(0, s.hero.hp))} / ${formatNumber(st.vida)}</td><td class="dim">DPS ${formatNumber(totalDps(st, s.mods) * golpeMundoMedio(s))}</td></tr>
    <tr><td>Bajas</td><td class="num">${s.kills}</td><td class="dim">caídas ${s.deaths}</td></tr>
    <tr><td colspan="3">&nbsp;</td></tr>${rows}</table>`;

  const last = s.eventLog[s.eventLog.length - 1];
  const logKey = `${s.seed}:${s.eventLog.length}:${last?.t}`;
  if (logKey !== lastLogKey) {
    lastLogKey = logKey;
    $('log').innerHTML = [...s.eventLog]
      .reverse()
      .map((e) => `<div><span class="t">${formatHMS(e.t)}</span>${e.text}</div>`)
      .join('');
  }

  // Pantalla "Nueva Jornada".
  const modal = $('new-day');
  if (!s.introSeen && modal.hidden) {
    const prev = game.save.chronicle[game.save.chronicle.length - 1];
    $('new-day-title').textContent = `Día ${game.save.chronicle.length + 1} · Nueva jornada`;
    $('new-day-seed').textContent = `${s.dateKey} · semilla ${s.seed}`;
    $('new-day-omen').textContent = `«${presagioDelDia(s.seed, s.world.condicion)}»`;
    $('new-day-summary').innerHTML = prev
      ? `<b>Crónica del día anterior (${prev.dateKey})</b><br>Tiempo trabajado: ${formatWorked(prev.workedMs)}<br>Era máxima: ${prev.era} · Tramo máximo: ${prev.maxZone + 1} (−${prev.depthM} m)<br>Bajas: ${prev.kills} · Moneda ganada: ${formatNumber(prev.totalGold)} · Cartas elegidas: ${prev.cartas.length}`
      : 'La Grieta se ha reacomodado. Cada jornada empieza de cero.';
  }
  modal.hidden = s.introSeen;

  crossroadsUi.refresh();
  refreshBase();
  refreshWorld();
  refreshChronicle();
  refreshSettings();
  updateDebug?.();
}

// ----- bucle -----
// La simulación avanza por tiempo real: un intervalo de 1 s la garantiza aunque la pestaña
// esté oculta (el navegador lo limita, pero step() simula todo lo acumulado). Con la pestaña
// visible, cada frame también llama a step() para que el movimiento sea fluido.
let lastSave = Date.now();
setInterval(() => {
  game.step();
  if (Date.now() - lastSave >= AUTOSAVE_MS) {
    lastSave = Date.now();
    game.persist();
  }
  refreshUi();
}, 1000);

// Tope de FPS: 30 jugando y 4 en pausa (en un monitor de 144 Hz no hace falta dibujar 144 veces).
let lastUi = 0;
let lastDraw = 0;
function frame(t: number): void {
  requestAnimationFrame(frame);
  if (t - lastDraw < (game.day.status === 'RUNNING' ? 1000 / 30 : 250) - 2) return;
  lastDraw = t;
  game.step();
  lastFrameT = t;
  renderer.draw(game.day, t + drawOffset);
  if (t - lastUi > 200) {
    lastUi = t;
    refreshUi();
  }
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => {
  game.step();
  game.persist();
});
window.addEventListener('beforeunload', () => {
  game.step();
  game.persist();
});

refreshUi();
