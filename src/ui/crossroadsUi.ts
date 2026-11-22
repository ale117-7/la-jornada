// Interfaz de Fase 2: modal de Encrucijada, paneles de build y sinergias, y avisos.
import type { GameApi } from '../core/api';
import { buildElements, synergyStatus } from '../core/build';
import { cardView, msToNextScheduled, type CardView } from '../core/crossroads';
import { describeEfectos } from '../core/mods';
import { CROSSROADS_NAMES } from '../data/crossroads';
import { CORRIENTES, SYNERGY_BY_TAG, type Tag } from '../data/tags';
import { cardArt, chassisThumb, companionThumb, synergyThumb } from './art';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const tagHtml = (t: Tag, shared = false) =>
  `<span class="tag${shared ? ' shared' : ''}" style="--tag:${SYNERGY_BY_TAG[t].color}">${t}</span>`;

const GLYPH: Record<string, string> = { origen: '▼', companero: '☻', rumbo: '➘', pacto: '✠', destino: '✶', reliquia: '◈' };

function cardHtml(v: CardView, i: number): string {
  const color = v.corriente === '?' ? '#8a93a8' : CORRIENTES[v.corriente].color;
  const art = cardArt(v.id);
  return `<button class="card" type="button" data-card="${i}" style="--cc:${color}">
    <div class="art">${art || (v.corriente === '?' && v.tipo === 'rumbo' ? '?' : GLYPH[v.tipo])}</div>
    <div class="body">
      <div class="meta"><span class="rar-${v.rareza}">${v.rareza.toUpperCase()}</span>${v.nuevo ? '<span class="new">NUEVO EN LA CRÓNICA</span>' : ''}</div>
      <div class="name">${v.nombre}</div>
      <div class="sub">${v.subtitulo}</div>
      <div class="flavor">${v.texto}</div>
      <ul>${v.lineas.map((l) => `<li>${l}</li>`).join('')}</ul>
      ${v.oculto ? '<div class="hidden-line">??? — se revela al elegirla</div>' : ''}
      <div>${v.etiquetas.map((t) => tagHtml(t, v.compartidas.includes(t))).join('')}</div>
    </div>
  </button>`;
}

function beep(): void {
  try {
    const ac = new AudioContext();
    const gain = ac.createGain();
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.9);
    [523.25, 783.99].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(gain);
      o.start(ac.currentTime + i * 0.12);
      o.stop(ac.currentTime + 0.9);
    });
    setTimeout(() => void ac.close(), 1200);
  } catch {
    /* sin audio */
  }
}

export function setupCrossroadsUi(game: GameApi): { refresh: () => void; pending: () => boolean } {
  const modal = $('crossroads');
  const cardsEl = $('crossroads-cards');
  const reopen = $<HTMLButtonElement>('btn-crossroads');
  const later = $<HTMLButtonElement>('btn-crossroads-later');
  const notifyBtn = $<HTMLButtonElement>('btn-notify');
  const desktop = !!window.jornada; // en escritorio avisa el proceso principal

  let renderedKey = '';
  let dismissedKey = '';
  let announcedKey = '';
  let lastBuildHtml = '';
  let lastSynHtml = '';

  cardsEl.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-card]');
    if (el) game.chooseCard(Number(el.dataset.card));
  });
  later.addEventListener('click', () => (dismissedKey = renderedKey));
  reopen.addEventListener('click', () => (dismissedKey = ''));

  const canAskNotify = () => !desktop && 'Notification' in window && Notification.permission === 'default';
  notifyBtn.addEventListener('click', () => void Notification.requestPermission().then(() => (notifyBtn.hidden = !canAskNotify())));

  // Ajustes: auto-elegir (10–60 min o desactivado), sonido y notificaciones.
  const autoSel = $<HTMLSelectElement>('set-auto');
  const soundChk = $<HTMLInputElement>('set-sound');
  const notifyChk = $<HTMLInputElement>('set-notify');
  autoSel.addEventListener('change', () => game.setSetting('autoChooseMs', Number(autoSel.value) * 60_000));
  soundChk.addEventListener('change', () => game.setSetting('sound', soundChk.checked));
  notifyChk.addEventListener('change', () => game.setSetting('notifications', notifyChk.checked));
  function syncSettings(): void {
    const st = game.save.settings;
    if (document.activeElement !== autoSel) autoSel.value = String(Math.round(st.autoChooseMs / 60_000));
    soundChk.checked = st.sound;
    notifyChk.checked = st.notifications;
  }

  function announce(tipo: string): void {
    const st = game.save.settings;
    if (st.sound) beep();
    if (!desktop && st.notifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('La Jornada', { body: `⚠ Encrucijada de ${tipo}: elige tu camino.` });
    }
  }

  function refresh(): void {
    syncSettings();
    const s = game.day;
    const p = s.pendingCrossroads;
    const key = p ? `${s.seed}:${p.index}:${p.cards.map((c) => c.id).join(',')}` : '';

    // Modal
    if (p && key !== renderedKey) {
      renderedKey = key;
      $('crossroads-title').textContent = `Encrucijada · ${CROSSROADS_NAMES[p.tipo]}`;
      cardsEl.innerHTML = p.cards.map((c, i) => cardHtml(cardView(s, c), i)).join('');
    }
    if (!p) renderedKey = '';
    if (p) {
      const left = s.autoChooseMs > 0 ? s.autoChooseMs - (s.workedMs - p.sinceMs) : -1;
      $('crossroads-sub').textContent =
        p.tipo === 'origen'
          ? 'Elige por dónde entras a la Grieta y con qué chasis. La jornada empieza al elegir.'
          : `La expedición acampa mientras decides.${left >= 0 ? ` El Destino elegirá por ti en ~${Math.max(1, Math.ceil(left / 60_000))} min trabajados.` : ''}`;
      later.hidden = p.tipo === 'origen';
      if (p.tipo !== 'origen' && key !== announcedKey) {
        announcedKey = key;
        announce(CROSSROADS_NAMES[p.tipo]);
      }
    }
    const open = !!p && s.introSeen && dismissedKey !== key;
    modal.hidden = !open;
    reopen.hidden = !p || open || !s.introSeen;
    notifyBtn.hidden = !canAskNotify();

    // "Próxima encrucijada en ~XX min" (aproximado, para mantener la intriga)
    const next = msToNextScheduled(s);
    $('next-crossroads').textContent = p
      ? '⚠ Encrucijada pendiente'
      : next === null
        ? 'Próxima encrucijada: —'
        : s.world.flags.anuncioTemprano
          ? `Próxima encrucijada: en ${Math.ceil(next / 60_000)} min (anunciada por la antena)`
          : `Próxima encrucijada: ${next <= 5 * 60_000 ? 'en menos de 5 min' : `~${Math.round(next / 300_000) * 5} min`}`;

    // Grupo y build
    const els = buildElements(s);
    const buildHtml = els.length
      ? els
          .map(
            (e) => `<div class="build-item">${e.tipo === 'Chasis' ? `<span class="bi-art">${chassisThumb(s.build.chassisId)}</span>` : e.tipo === 'Compañero' && e.id ? `<span class="bi-art">${companionThumb(e.id)}</span>` : ''}<div class="kind">${e.tipo}</div><div>${e.nombre}</div>
              <div class="detail">${e.detalle}</div>${e.tipo === 'Compañero' || e.tipo === 'Chasis' ? `<div class="detail">${describeEfectos(e.efectos).join(' · ')}</div>` : ''}
              <div>${e.etiquetas.map((t) => tagHtml(t)).join('')}</div></div>`,
          )
          .join('') + s.build.extras.map((x) => `<div class="build-item"><div class="kind">??? revelado</div><div class="detail">${x.texto} ${describeEfectos(x.efectos).join(' · ')}</div></div>`).join('')
      : '<div class="empty">Sin build todavía: elige el Origen.</div>';
    if (buildHtml !== lastBuildHtml) $('build-panel').innerHTML = lastBuildHtml = buildHtml;

    // Sinergias: cuenta por etiqueta ("Fuego 2/3") y efectos activos
    const syn = synergyStatus(s);
    const synHtml = syn.length
      ? syn
          .map(
            (x) => `<div class="syn" style="--tag:${x.def.color}">
              <div class="head"><span>${synergyThumb(x.def.tag)} ${x.def.tag}</span><span>${x.count}${x.siguiente ? `/${x.siguiente.n}` : ' · MÁX'}</span></div>
              ${x.def.niveles.map((l) => `<div class="lvl ${x.count >= l.n ? 'on' : 'off'}">×${l.n} ${l.nombre}: ${describeEfectos(l.efectos).join(', ')}</div>`).join('')}
            </div>`,
          )
          .join('')
      : '<div class="empty">Reúne 2 elementos con la misma etiqueta para activar una sinergia.</div>';
    if (synHtml !== lastSynHtml) $('synergy-panel').innerHTML = lastSynHtml = synHtml;
  }

  return { refresh, pending: () => !!game.day.pendingCrossroads };
}
