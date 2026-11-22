// Interfaz de Fase 3: capa (era), monedas, Base Colgante, equipo, mascotas y estado del Umbral.
import type { GameApi } from '../core/api';
import { buildingCost, petSlots } from '../core/base';
import { formatNumber, pad3 } from '../core/format';
import { describeEfectos, scaleEfectos } from '../core/mods';
import { depthMeters, isFarming } from '../core/sim';
import { BLESSING_BY_ID, BUILDINGS, SLOT_BY_ID, SLOTS } from '../data/buildings';
import { CURRENCIES } from '../data/currencies';
import { ERAS } from '../data/eras';
import { META_UPGRADES } from '../data/metaUpgrades';
import { PET_BY_ID } from '../data/pets';
import { buildingThumb, equipThumb, petThumb } from './art';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function setupBaseUi(game: GameApi): () => void {
  let lastBase = '';
  let lastGear = '';

  return () => {
    const s = game.day;
    const era = ERAS[s.era];

    // Señalética: "CAPA 03 · EL BOSQUE INVERTIDO / TRAMO 041 / −6.420 M"
    const boss = s.creatures.find((c) => c.boss);
    const estado = isFarming(s)
      ? ' · farmeando tramos anteriores'
      : s.world.pausaMs > 0
        ? ' · detenido'
        : s.eraWait
        ? ` · el paso a ${ERAS[s.era + 1].capa} se abre a las ${ERAS[s.era + 1].thresholdMs / 3_600_000} h`
        : boss
          ? ` · ☠ ${boss.nombre}`
          : '';
    const capa = s.world.sub ? `${era.capa.toUpperCase()} › ${s.world.sub.nombre.toUpperCase()}` : era.capa.toUpperCase();
    $('signage').textContent = `CAPA ${String(s.era + 1).padStart(2, '0')} · ${capa} / TRAMO ${pad3(s.zone + 1)} / −${Math.round(depthMeters(s)).toLocaleString('es-ES')} M${estado}`;

    // Monedas de era (solo las ya descubiertas)
    $('currencies').textContent = CURRENCIES.filter((c) => s.unlockedCurrencies.includes(c.id))
      .map((c) => `${c.nombre}: ${formatNumber(s.currencies[c.id])}`)
      .join(' · ');

    // Base Colgante: un bloque por edificio; crece con el nivel
    const built = BUILDINGS.filter((b) => s.base.buildings[b.id]);
    const strip = $('base-strip');
    strip.hidden = built.length === 0;
    const baseHtml = built
      .map((b) => {
        const n = s.base.buildings[b.id];
        const what = b.efectos
          ? describeEfectos(scaleEfectos(b.efectos, n)).join(', ')
          : b.produce
            ? `produce ${b.produce.moneda === 'oro' ? 'moneda' : b.produce.moneda}`
            : b.oficio
              ? `oficio: ${b.oficio.nombre}`
              : b.texto;
        const next = n >= b.maxNivel ? 'nivel máximo' : `siguiente: ${formatNumber(buildingCost(b, n))} materiales`;
        const art = buildingThumb(b.id, 30 + Math.min(n, 10) * 2);
        return `<div class="bld${art ? ' art' : ''}" style="--h:${18 + n * 5}px" title="${b.texto} ${what}. ${next}"><div class="cable"></div>${art ? `<div class="mod">${art}<b>${n}</b></div>` : `<div class="box"><b>${n}</b></div>`}<span>${b.nombre}</span></div>`;
      })
      .join('');
    if (baseHtml !== lastBase) $('base-blocks').innerHTML = lastBase = baseHtml;

    // Equipo (oficios), mascotas, mejoras de era y bendición
    const gear: string[] = [];
    const items = SLOTS.filter((sl) => s.equipment[sl.id]);
    if (items.length) {
      gear.push('<div class="sec">Equipo fabricado</div>');
      for (const sl of items) {
        const it = s.equipment[sl.id]!;
        gear.push(`<div class="row"><span>${equipThumb(sl.id, it.nombre)} ${it.nombre}</span><span class="dim">${describeEfectos(scaleEfectos(SLOT_BY_ID[sl.id].efectos, it.poder)).join(', ')}</span></div>`);
      }
    }
    if (s.pets.length) {
      gear.push(`<div class="sec">Mascotas (${s.pets.length}/${petSlots(s)})</div>`);
      for (const p of s.pets) {
        const d = PET_BY_ID[p.id];
        gear.push(`<div class="row"><span style="color:${d.color}">${petThumb(p.id)} ${d.nombre} nv ${p.level}</span><span class="dim">${describeEfectos(scaleEfectos(d.efectos, p.level)).join(', ')}</span></div>`);
      }
    }
    const metas = META_UPGRADES.filter((m) => s.meta[m.id]);
    if (metas.length) {
      gear.push('<div class="sec">Mejoras de era</div>');
      for (const m of metas) gear.push(`<div class="row"><span>${m.nombre} nv ${s.meta[m.id]}</span><span class="dim">${describeEfectos(scaleEfectos(m.efectos, s.meta[m.id])).join(', ')}</span></div>`);
    }
    if (s.base.blessing) {
      const bl = BLESSING_BY_ID[s.base.blessing.id];
      gear.push(`<div class="sec">${bl.nombre}</div><div class="row"><span class="dim">${describeEfectos(bl.efectos).join(', ')} · quedan ${Math.max(0, Math.ceil((s.base.blessing.untilMs - s.workedMs) / 60_000))} min</span></div>`);
    }
    const gearHtml = gear.join('');
    if (gearHtml !== lastGear) $('gear-panel').innerHTML = lastGear = gearHtml;
  };
}
