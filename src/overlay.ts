// Ventana overlay (escritorio): franja transparente con el runner y los controles mínimos.
// No simula nada: dibuja el estado que envía el proceso principal.
import './overlay.css';
import type { Snapshot } from './core/api';
import { formatNumber, formatWorked, pad3 } from './core/format';
import { cardView } from './core/crossroads';
import { depthMeters } from './core/sim';
import { hasMechanic } from './core/worldMods';
import { CROSSROADS_NAMES } from './data/crossroads';
import { ERAS } from './data/eras';
import { SYNERGY_BY_TAG } from './data/tags';
import { CORRIENTES } from './data/tags';
import { Renderer } from './render/renderer';

const api = window.jornada!;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('strip');
const controls = $('controls');
const toggle = $<HTMLButtonElement>('toggle');
const renderer = new Renderer(canvas);

let snap: Snapshot | null = null;
let lastStateAt = 0;

function updateDom(): void {
  if (!snap) return;
  const s = snap.save.current!;
  const running = s.status === 'RUNNING';
  document.body.dataset.layout = snap.overlay.layout;
  const ov = snap.overlay;
  document.body.classList.toggle('compact', ov.bandHeight < 90);
  document.body.classList.toggle('cards-below', ov.cardsSide === 'below');
  document.body.style.setProperty('--band-h', ov.expanded ? `${ov.bandHeight}px` : '100%');
  document.body.style.setProperty('--band-px', String(ov.bandHeight));
  document.body.style.setProperty('--band-w', ov.expanded ? `${ov.bandWidth}px` : '100%');
  renderCards();
  toggle.textContent = running ? '⏸' : '▶';
  toggle.classList.toggle('running', running);
  $('clock').textContent = formatWorked(s.workedMs);
  $('depth').textContent = `−${Math.round(depthMeters(s)).toLocaleString('es-ES')} M`;
  $('extra').textContent = `${s.world.sub ? s.world.sub.nombre : `ERA ${ERAS[s.era].romano}`} · TRAMO ${pad3(s.zone + 1)} · ${formatNumber(s.gold)} ${s.corriente ? CORRIENTES[s.corriente].moneda.toLowerCase() : ''}`;
  // Aviso de Encrucijada pendiente: al pulsarlo se abre el panel con las 3 cartas.
  $('alert').hidden = !s.pendingCrossroads;
  document.body.classList.toggle('faded', ov.faded);
  updateBanner();
  // Frontera de Ruido: los controles y el aviso se deforman (overlay.css).
  document.body.classList.toggle('glitch', hasMechanic(snap!.save.current!, 'glitch'));
}

// ----- banner de «¡algo nuevo!»: cada hito de la jornada se anuncia unos segundos -----
const bannerEl = $('banner');
const BANNER_MS = 7000;
let bannerKey = '';
let bannerSeen = -1;
let bannerTimer = 0;
function updateBanner(): void {
  const s = snap!.save.current!;
  const key = `${s.dateKey}:${s.seed}`;
  if (key !== bannerKey || s.hitos.length < bannerSeen) {
    // Jornada nueva (o reiniciada): lo ya ocurrido no se anuncia.
    bannerKey = key;
    bannerSeen = s.hitos.length;
    return;
  }
  if (s.hitos.length === bannerSeen) return;
  // Si llegaron varios a la vez (catch-up), se muestra solo el último.
  const h = s.hitos[s.hitos.length - 1];
  bannerSeen = s.hitos.length;
  const cadena = h.id.startsWith('cadena_');
  bannerEl.textContent = h.text.replace(/^[⚑★☠📜]\s*/u, '');
  bannerEl.classList.toggle('chain', cadena);
  bannerEl.dataset.icon = cadena ? '📜' : h.id.startsWith('jefe') || h.id.startsWith('subumbral') ? '☠' : '✦';
  bannerEl.hidden = false;
  // Reinicia la animación aunque ya hubiera un banner a la vista.
  bannerEl.style.animation = 'none';
  void bannerEl.offsetWidth;
  bannerEl.style.animation = '';
  window.clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => (bannerEl.hidden = true), BANNER_MS);
}

// ----- cartas de la Encrucijada, desplegadas junto a la franja -----
const cardsEl = $('cards');
let cardsKey = '';
function renderCards(): void {
  const s = snap!.save.current!;
  const p = s.pendingCrossroads;
  const open = !!p && snap!.overlay.expanded;
  cardsEl.hidden = !open;
  const key = open ? `${s.seed}:${p!.index}:${p!.cards.map((c) => c.id).join(',')}` : '';
  if (key === cardsKey) return;
  cardsKey = key;
  if (!open) return;
  const cards = p!.cards
    .map((c, i) => {
      const v = cardView(s, c);
      const color = v.corriente === '?' ? '#8a93a8' : CORRIENTES[v.corriente].color;
      const tags = v.etiquetas
        .map((t) => `<span class="tag${v.compartidas.includes(t) ? ' shared' : ''}" style="--tag:${SYNERGY_BY_TAG[t].color}">${t}</span>`)
        .join('');
      return `<button class="ocard" type="button" data-card="${i}" style="--cc:${color}">
        <div class="meta">${v.rareza.toUpperCase()}${v.nuevo ? ' · <b>NUEVO</b>' : ''}</div>
        <div class="name">${v.nombre}</div><div class="sub">${v.subtitulo}</div>
        <ul>${v.lineas.map((l) => `<li>${l}</li>`).join('')}</ul>
        ${v.oculto ? '<div class="q">???</div>' : ''}<div>${tags}</div></button>`;
    })
    .join('');
  cardsEl.innerHTML = `<div class="head"><span>⚠ Encrucijada · ${CROSSROADS_NAMES[p!.tipo]} — elige 1 de 3</span><button type="button" data-close>Decidir luego</button></div><div class="row">${cards}</div>`;
}
cardsEl.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const card = t.closest<HTMLElement>('[data-card]');
  if (card) void api.cmd('chooseCard', Number(card.dataset.card));
  else if (t.closest('[data-close]')) api.expand(false);
});

api.onState((s) => {
  snap = s;
  lastStateAt = performance.now();
  updateDom();
});
void api.getState().then((s) => {
  snap ??= s;
  lastStateAt = performance.now();
  updateDom();
});

// ----- click-through: solo los controles reciben clics -----
// El proceso principal compara la posición del cursor con estos rectángulos y activa o
// desactiva el click-through. (Depender de mouseenter/mouseleave con eventos reenviados
// provoca un bucle: al desactivar el click-through, Chromium recibe un «mouseleave».)
let dragging = false;
let lastRects = '';
function reportHitRects(): void {
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  // Se captura el recuadro de controles entero (no solo cada botón): así, cuando el cursor llega a
  // un botón, Chromium ya ha recibido movimiento real dentro de la ventana y el primer clic no se pierde.
  for (const el of document.querySelectorAll<HTMLElement>('#controls, #cards')) {
    if (el.hidden || el.closest('[hidden]') || getComputedStyle(el).display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    rects.push({ x: Math.floor(r.x) - 2, y: Math.floor(r.y) - 2, w: Math.ceil(r.width) + 4, h: Math.ceil(r.height) + 4 });
  }
  const key = JSON.stringify(rects);
  if (key === lastRects) return;
  lastRects = key;
  api.setHitRects(rects);
}
new ResizeObserver(reportHitRects).observe(document.body);
new MutationObserver(reportHitRects).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
window.addEventListener('resize', reportHitRects);

toggle.addEventListener('click', () => void api.cmd('toggle'));
$('alert').addEventListener('click', () => api.expand(!snap?.overlay.expanded));
$('info').addEventListener('dblclick', () => void api.cmd('openPanel'));

// ----- asa de arrastre (ventana flotante y mínimo) -----
const handle = $('handle');
handle.addEventListener('pointerdown', (e) => {
  handle.setPointerCapture(e.pointerId);
  dragging = true;
  api.drag(true);
});
const endDrag = () => {
  if (!dragging) return;
  dragging = false;
  api.drag(false);
};
handle.addEventListener('pointerup', endDrag);
handle.addEventListener('pointercancel', endDrag);
handle.addEventListener('lostpointercapture', endDrag);

// El proceso principal avisa de si el cursor está sobre un control (para los estilos :hover).
api.onPointer((inside) => document.body.classList.toggle('pointer-in', inside));

// ----- dibujo limitado a los FPS configurados; sin estado reciente (overlay oculto) no se dibuja -----
// En pausa el dibujo es estático: solo se repinta cuando llega un estado nuevo o cambia el tamaño.
let lastDraw = 0;
let lastDrawKey = '';
function frame(t: number): void {
  requestAnimationFrame(frame);
  if (!snap || snap.overlay.layout === 'mini') return;
  if (t - lastStateAt > 2500 || t - lastDraw < 1000 / snap.overlay.fps - 2) return;
  const key = `${lastStateAt}|${canvas.clientWidth}x${canvas.clientHeight}|${snap.overlay.expanded}|${snap.overlay.faded}`;
  if (snap.save.current!.status !== 'RUNNING' && key === lastDrawKey) return;
  lastDrawKey = key;
  lastDraw = t;
  const strip = snap.overlay.layout !== 'float';
  renderer.draw(snap.save.current!, t, {
    overlay: true,
    leftInset: strip ? controls.getBoundingClientRect().right : 0,
  });
}
requestAnimationFrame(frame);
