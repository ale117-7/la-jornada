// Interfaz de Fase 4: condición del día, sub-capa, Presión, sucesos activos, cadenas,
// mutaciones, bestiario y combos secretos.
import type { GameApi } from '../core/api';
import { describeEfectos } from '../core/mods';
import { conditionOf, mechanicStatus } from '../core/worldMods';
import { CHAIN_BY_ID } from '../data/chains';
import { COMBO_BY_ID } from '../data/combos';
import { ERAS, LAYER_VARIANTS } from '../data/eras';
import { EVENTS } from '../data/events';
import { MUTATION_BY_ID } from '../data/mutations';
import { MECHANIC_BY_ID } from '../data/route';
import { mutationThumb } from './art';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function setupWorldUi(game: GameApi): () => void {
  let last = '';
  return () => {
    const s = game.day;
    const w = s.world;
    const cond = conditionOf(s);
    const rows: string[] = [];
    const sec = (t: string) => rows.push(`<div class="sec">${t}</div>`);
    const row = (a: string, b = '') => rows.push(`<div class="row"><span>${a}</span><span class="dim">${b}</span></div>`);

    sec('Hoy');
    row(cond.nombre, cond.texto);
    if (w.sub) {
      row(`Sub-capa: ${w.sub.nombre}${w.sub.ciclo ? ` · Ciclo ${w.sub.ciclo}` : ''}`, w.sub.mecanicas.map((id) => MECHANIC_BY_ID[id].nombre).join(' + '));
      for (const id of w.sub.mecanicas) {
        row('', MECHANIC_BY_ID[id].texto);
        const st = mechanicStatus(s, id);
        if (st) row('', `▸ ${st}`);
      }
    } else if (s.corriente && s.era < 4) {
      row(ERAS[s.era].capa, LAYER_VARIANTS[s.era][s.corriente]);
    }
    if (s.era >= 1) row(`Presión: ${Math.round(w.presion)}`, w.presion > 0 ? (s.mods.presionInvertida > 0 ? 'te afila' : `−${Math.round(Math.min(100, w.presion) * 0.25)} % de ataque y vida`) : 'sin efecto');
    row(`Criaturas descubiertas hoy: ${w.bestiario.length}`, `${w.modsVistos.length} modificadores · ${new Set(w.eventos).size}/${EVENTS.length} eventos`);

    if (w.buffs.length) {
      sec('Sucesos activos');
      for (const b of w.buffs) {
        const fx = describeEfectos(b.efectos).join(', ');
        row(b.nombre, `${fx ? fx + ' · ' : ''}${Math.max(1, Math.ceil((b.untilMs - s.workedMs) / 60_000))} min`);
      }
    }
    if (w.cadenas.length) {
      sec('Cadenas');
      for (const c of w.cadenas) row(`📜 ${CHAIN_BY_ID[c.id].nombre}`, `${c.parte}/${c.tiempos.length}${c.parte >= c.tiempos.length ? ' · completa' : ''}`);
    }
    if (w.mutaciones.length) {
      sec('Mutaciones');
      for (const id of w.mutaciones) {
        const m = MUTATION_BY_ID[id];
        row(`<span style="color:${m.color}">${mutationThumb(id) || (m.buena ? '▲' : '▼')} ${m.nombre}</span>`, describeEfectos(m.efectos).join(', '));
      }
    }
    const combos = [...w.combos.map((id) => ({ id, ok: true })), ...w.combosRevelados.filter((id) => !w.combos.includes(id)).map((id) => ({ id, ok: false }))];
    if (combos.length) {
      sec('Combos secretos');
      for (const c of combos) {
        const d = COMBO_BY_ID[c.id];
        row(`${c.ok ? '◆' : '◇'} ${d.nombre} (${d.tags[0]} + ${d.tags[1]})`, c.ok ? describeEfectos(d.efectos).join(', ') : 'receta revelada, sin activar');
      }
    }
    const html = rows.join('');
    if (html !== last) $('world-panel').innerHTML = last = html;

    // Condición del día en la pantalla "Nueva Jornada".
    $('new-day-condition').textContent = `${cond.nombre} — ${cond.texto}`;
  };
}
