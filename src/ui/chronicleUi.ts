// Pantalla de Crónica (sección 12): gráfico de horas trabajadas por día, racha, récords
// personales y la lista de jornadas. Solo lee el guardado; no afecta al juego.
import type { GameApi } from '../core/api';
import { chronicleStats } from '../core/chronicle';
import { formatNumber, formatWorked } from '../core/format';
import type { ChronicleEntry } from '../core/types';
import { CHAIN_BY_ID } from '../data/chains';
import { COMBO_BY_ID } from '../data/combos';
import { CONDITION_BY_ID } from '../data/dayConditions';
import { ERAS } from '../data/eras';
import { EVENT_BY_ID } from '../data/events';
import { SUBLAYERS } from '../data/route';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const fecha = (key: string) => {
  const d = new Date(`${key}T12:00:00`);
  return Number.isNaN(d.getTime()) ? key : `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};

function dayHtml(e: ChronicleEntry): string {
  const era = ERAS[Math.min(ERAS.length, Math.max(1, e.era)) - 1];
  const lines: string[] = [];
  lines.push(`Era ${era.romano} · ${e.subcapa ?? era.capa} · tramo ${e.maxZone + 1} (−${e.depthM.toLocaleString('es-ES')} m) · ${e.kills} bajas · ${formatNumber(e.totalGold)} de moneda`);
  const cond = CONDITION_BY_ID[e.condicion];
  const extra = [`${e.cartas.length} cartas`, `${e.criaturas} criaturas`, `${e.eventos} eventos`];
  if (cond && cond.id !== 'normal') extra.unshift(cond.nombre);
  lines.push(extra.join(' · '));
  const sin = Object.entries(e.sinergias).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
  if (sin.length) lines.push(`Sinergias: ${sin.map(([t, n]) => `${t} ×${n}`).join(', ')}`);
  if (e.combos.length) lines.push(`Combos secretos: ${e.combos.map((id) => COMBO_BY_ID[id]?.nombre ?? id).join(', ')}`);
  if (e.rarezas.length) lines.push(`Rarezas vistas: ${e.rarezas.map((id) => EVENT_BY_ID[id]?.nombre ?? id).join(', ')}`);
  if (e.cadenas.length) {
    lines.push(`Historias: ${e.cadenas.map((c) => `${CHAIN_BY_ID[c.id]?.nombre ?? c.id} ${c.partes >= c.total ? '(completa)' : `${c.partes}/${c.total} — sin terminar…`}`).join(' · ')}`);
  }
  return `<div class="chr-day"><div class="h"><span>${fecha(e.dateKey)} · ${e.dateKey}</span><span>${formatWorked(e.workedMs)}</span></div><div class="d">${lines.join('<br>')}</div></div>`;
}

export function setupChronicleUi(game: GameApi): () => void {
  const modal = $('chronicle');
  const body = $('chronicle-body');
  let last = '';

  $('btn-chronicle').addEventListener('click', () => {
    modal.hidden = false;
    render();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal || (e.target as HTMLElement).closest('[data-close]')) modal.hidden = true;
  });

  function render(): void {
    const st = chronicleStats(game.save);
    const max = Math.max(3_600_000, ...st.dias.map((d) => d.workedMs));
    // Escala del gráfico: horas enteras por encima del máximo.
    const topH = Math.ceil(max / 3_600_000);
    const best = Math.max(...st.dias.map((d) => d.workedMs));
    const bars = st.dias
      .map((d) => {
        const pct = (d.workedMs / (topH * 3_600_000)) * 100;
        const cls = `${d.workedMs === 0 ? ' zero' : ''}${d.hoy ? ' hoy' : ''}${!d.hoy && d.workedMs > 0 && d.workedMs === best ? ' best' : ''}`;
        return `<div class="chr-bar${cls}" title="${fecha(d.dateKey)} · ${formatWorked(d.workedMs)}${d.hoy ? ' (hoy)' : ''}" style="--h:${pct.toFixed(1)}%"><em>${formatWorked(d.workedMs)}</em><i></i></div>`;
      })
      .join('');
    const grid = Array.from({ length: topH }, (_, i) => i + 1)
      .filter((h) => topH <= 6 || h % 2 === 0)
      .map((h) => `<div class="chr-grid" style="bottom:${((h / topH) * (150 - 18)).toFixed(0)}px">${h} h</div>`)
      .join('');
    const axis = st.dias.map((d, i) => `<span>${i % 5 === 0 || i === st.dias.length - 1 ? fecha(d.dateKey).split(' ')[1] : ''}</span>`).join('');

    // Hitos de la ruta: los que aún no se han visto quedan con llave.
    const hours = Math.max(game.day.workedMs, ...game.save.chronicle.map((c) => c.workedMs), 0) / 3_600_000;
    const ruta = SUBLAYERS.map((sl) => (hours >= sl.hora ? `<span title="Hora ${sl.hora}">${sl.nombre}</span>` : `<span class="dim" title="Hora ${sl.hora}">🔒 ???</span>`)).join(' · ');

    const r = st.records;
    const stat = (k: string, v: string, d = '') => `<div class="chr-stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d || '&nbsp;'}</div></div>`;
    const list = [...game.save.chronicle].reverse().map(dayHtml).join('');
    const html = `
      <div class="chr-stats">
        ${stat('Racha', `${st.racha} ${st.racha === 1 ? 'día' : 'días'}`, `mejor racha: ${st.mejorRacha}`)}
        ${stat('Jornadas', String(st.diasJugados), `${formatWorked(st.totalMs)} en total`)}
        ${stat('Récord de horas', r.horasMs ? formatWorked(r.horasMs) : '—', r.horasDia)}
        ${stat('Récord de tramo', r.tramo ? `${r.tramo}` : '—', r.tramo ? `−${r.profundidad.toLocaleString('es-ES')} m · Era ${ERAS[Math.max(1, r.era) - 1].romano}` : '')}
      </div>
      <h2 class="chr-sec">Horas trabajadas · últimos ${st.dias.length} días</h2>
      ${st.dias.length ? `<div class="chr-chart">${grid}${bars}</div><div class="chr-axis">${axis}</div>` : '<div class="empty">Todavía no hay jornadas.</div>'}
      <h2 class="chr-sec">Lo Hondo · sub-capas vistas</h2>
      <div class="chr-day"><div class="d">${ruta}</div></div>
      <h2 class="chr-sec" style="margin-top:16px">Jornadas</h2>
      <div class="chr-list">${list || '<div class="empty">Aquí aparecerá cada jornada al cerrarse el día. La de hoy sigue en marcha.</div>'}</div>`;
    if (html !== last) body.innerHTML = last = html;
  }

  return () => {
    if (!modal.hidden) render();
  };
}
