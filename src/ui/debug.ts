// Panel debug (?debug=1): velocidad, saltos, semilla, fecha y fórmulas en vivo.
import { formatHMS, formatNumber } from '../core/format';
import { creatureAtk, creatureGold, creatureHp, heroStats, power, totalDps } from '../core/formulas';
import type { GameApi } from '../core/api';
import { lastSimMode, upgradeOptions } from '../core/sim';
import { BAL } from '../data/balance';
import { ERAS } from '../data/eras';
import { FAMILY_BY_ID } from '../data/families';
import { artBench } from './artBench';

const SPEEDS = [1, 10, 60, 600];

export function setupDebug(root: HTMLElement, game: GameApi): () => void {
  root.hidden = false;
  root.innerHTML = `
    <h2>DEBUG</h2>
    <div class="row">Velocidad: ${SPEEDS.map((v) => `<button data-speed="${v}">x${v}</button>`).join('')}</div>
    <div class="row">
      Saltar a la hora <input id="dbg-hour" type="number" min="0" step="0.25" value="1" />
      <button id="dbg-jump">Saltar</button>
      <button id="dbg-force">Forzar Encrucijada</button>
    </div>
    <div class="row">
      Semilla <input id="dbg-seed" type="number" />
      <button id="dbg-set-seed">Cambiar semilla (reinicia el día)</button>
      <button id="dbg-reset">Reiniciar el día</button>
    </div>
    <div class="row">
      Fecha: <button id="dbg-day-prev">−1 día</button><button id="dbg-day-next">+1 día</button>
      <button id="dbg-day-real">Fecha real</button>
      Hora de corte <input id="dbg-cutoff" type="number" min="0" max="23" step="1" />
      <button id="dbg-set-cutoff">Aplicar</button>
    </div>
    <pre id="dbg-formulas"></pre>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const speedButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-speed]')];
  const markSpeed = () => speedButtons.forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === game.speed));
  speedButtons.forEach((b) =>
    b.addEventListener('click', () => game.setSpeed(Number(b.dataset.speed))),
  );

  const seedInput = $<HTMLInputElement>('#dbg-seed');
  const cutoffInput = $<HTMLInputElement>('#dbg-cutoff');
  seedInput.value = String(game.day.seed);
  cutoffInput.value = String(game.save.settings.cutoffHour);

  $('#dbg-jump').addEventListener('click', () => game.jumpToHour(Number($<HTMLInputElement>('#dbg-hour').value)));
  $('#dbg-set-seed').addEventListener('click', () => game.resetDay(Number(seedInput.value) >>> 0));
  $('#dbg-force').addEventListener('click', () => game.forceCrossroads());
  $('#dbg-reset').addEventListener('click', () => game.resetDay());
  $('#dbg-day-prev').addEventListener('click', () => game.shiftDate(-1));
  $('#dbg-day-next').addEventListener('click', () => game.shiftDate(1));
  $('#dbg-day-real').addEventListener('click', () => game.shiftDate(null));
  $('#dbg-set-cutoff').addEventListener('click', () => game.setCutoffHour(Number(cutoffInput.value)));

  (window as unknown as { __arte: ReturnType<typeof artBench> }).__arte = artBench(game);

  const out = $('#dbg-formulas');
  let shownSeed = game.day.seed;
  return () => {
    const s = game.day;
    markSpeed();
    if (s.seed !== shownSeed) {
      shownSeed = s.seed;
      seedInput.value = String(s.seed);
    }
    const st = heroStats(s.upgrades, s.mods);
    const z = s.zone;
    const c = s.creatures[0];
    const famLines = s.unlockedFamilies.map((id) => {
      const f = FAMILY_BY_ID[id];
      return `  ${f.nombre}: HP ${BAL.CREATURE_HP_BASE}×${BAL.CREATURE_HP_GROWTH}^${z}×${f.hpMult} = ${formatNumber(creatureHp(z, f))} · ATQ ${BAL.CREATURE_ATK_BASE}×${BAL.CREATURE_ATK_GROWTH}^${z}×${f.atkMult} = ${formatNumber(creatureAtk(z, f))} · oro ${BAL.CREATURE_GOLD_BASE}×${BAL.CREATURE_GOLD_GROWTH}^${z}×${f.goldMult} = ${formatNumber(creatureGold(z, f))}`;
    });
    const opts = upgradeOptions(s)
      .sort((a, b) => b.ratio - a.ratio)
      .map((o) => `  ${o.def.nombre} n${o.level}→${o.level + 1}: coste ${o.def.baseCost}×${BAL.UPGRADE_COST_GROWTH}^${o.level} = ${formatNumber(o.cost)} · valor/coste ${(o.ratio * 1000).toFixed(3)}‰${o.cost <= s.gold ? ' ✓' : ''}`);
    const offsetDays = Math.round(game.save.settings.debugClockOffsetMs / 86_400_000);
    out.textContent = [
      `Simulación: ${lastSimMode} · velocidad x${game.speed} · trabajado ${formatHMS(s.workedMs)} (${s.workedMs} ms)`,
      `Día ${s.dateKey} · semilla ${s.seed} · corte ${game.save.settings.cutoffHour}:00 · desfase ${offsetDays >= 0 ? '+' : ''}${offsetDays} d · hueco máx. ${game.save.settings.gapThresholdMs / 60_000} min · días en la Crónica: ${game.save.chronicle.length}`,
      `Héroe: vida ${formatNumber(s.hero.hp)}/${formatNumber(st.vida)} · ataque ${formatNumber(st.ataque)} · ${st.velocidadAtaque.toFixed(2)} golpes/s · crít ${(st.critico * 100).toFixed(0)} % ×${st.danoCritico} · defensa ${st.defensa} · regen ${formatNumber(st.vida * st.regeneracion)}/s`,
      `  DPS = ataque×(1+crít×(dañoCrít−1))×(1+golpeFuerte/5)×vel + veneno = ${formatNumber(totalDps(st, s.mods))} · poder ${formatNumber(power(st))} · caídas en este tramo ${s.zoneDeaths} (debuff ×${Math.pow(BAL.DEATH_DEBUFF, s.zoneDeaths).toFixed(2)})`,
      `Tramo ${z + 1} (z=${z}) · quedan ${s.creatures.length} criaturas${c ? ` · objetivo ${FAMILY_BY_ID[c.familyId].nombre} ${formatNumber(c.hp)}/${formatNumber(c.maxHp)} HP` : ''}`,
      ...famLines,
      `Era ${ERAS[s.era].romano} (${ERAS[s.era].capa}): multHp ${ERAS[s.era].multHp} · multAtk ${ERAS[s.era].multAtk} · oro ×${ERAS[s.era].oroMult} · Umbral de era ×${ERAS[s.era].jefe.hpMult} vida, ×${ERAS[s.era].jefe.atkMult} ataque · caídas contra el Umbral ${s.boss.deaths}${s.eraWait ? ' · esperando el umbral de tiempo' : ''}`,
      `Encrucijadas: ${s.scheduledCrossroads.map((c) => `${c.tipo} ${formatHMS(c.atMs)}${c.done ? ' ✓' : ''}`).join(' · ')}${s.pendingCrossroads ? ' · PENDIENTE' : ''}`,
      `Modificadores ≠ base: ${Object.entries(s.mods).filter(([k, v]) => v !== (k.endsWith('Mult') ? 1 : 0)).map(([k, v]) => `${k} ${+v.toFixed(2)}`).join(' · ') || '—'}`,
      `IA de compras (cada ${BAL.AI_BUY_INTERVAL_MS / 1000} s, mejor valor/coste pagable):`,
      ...opts,
    ].join('\n');
  };
}
