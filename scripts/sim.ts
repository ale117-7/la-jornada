// Simulador headless: juega un día completo en segundos y muestra la línea de tiempo.
//   npm run sim                      día de 8 h, semilla aleatoria, cartas al azar
//   npm run sim -- --hours=8 --seed=123
//   npm run sim -- --quiet           sin el detalle tramo a tramo
//   npm run sim -- --balance=30      30 semillas: objetivos de la sección 8 (mín / mediana / máx)
//   npm run sim -- --compare         compara simulación detallada vs rápida (catch-up)
//   npm run sim -- --hours=16        día largo: sub-capas de Lo Hondo, hitos y contenido nuevo por hora
//   npm run sim -- --variety         10 días: eventos en común en el mismo orden (debe ser < 40 %)
import { synergyStatus } from '../src/core/build';
import { applyChoice, cardView } from '../src/core/crossroads';
import { formatHMS, formatNumber } from '../src/core/format';
import { heroStats, totalDps } from '../src/core/formulas';
import { hashString, nextFloat } from '../src/core/rng';
import { advance, createDay, depthMeters } from '../src/core/sim';
import type { DayState } from '../src/core/types';
import { BUILDINGS } from '../src/data/buildings';
import { CHAIN_BY_ID } from '../src/data/chains';
import { CROSSROADS_NAMES } from '../src/data/crossroads';
import { CONDITION_BY_ID } from '../src/data/dayConditions';
import { EVENTS } from '../src/data/events';
import { CURRENCIES } from '../src/data/currencies';
import { ERAS } from '../src/data/eras';
import { FAMILY_BY_ID } from '../src/data/families';
import { UPGRADES } from '../src/data/upgrades';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const hours = Number(args.hours ?? 8);
const baseSeed = args.seed !== undefined ? Number(args.seed) >>> 0 : (Date.now() ^ (process.pid << 12)) >>> 0;
const totalMs = hours * 3_600_000;
const quiet = !!args.quiet;

/** Objetivos de ritmo de la sección 8 (minutos trabajados), con tolerancia de ±15 %. */
const TOL = 0.15;
const TARGETS: { hito: string; nombre: string; min: number; max: number }[] = [
  { hito: 'jefe1_visto', nombre: 'Jefe de la Era I (se alcanza)', min: 45, max: 55 },
  { hito: 'era2', nombre: 'Era II · Los Andamios', min: 65, max: 80 },
  { hito: 'era3', nombre: 'Era III · El Bosque Invertido', min: 130, max: 150 },
  { hito: 'era4', nombre: 'Era IV · La Necrópolis', min: 220, max: 240 },
  { hito: 'era5', nombre: 'Era V · Lo Hondo', min: 300, max: 300 },
];
const hm = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`;
const range = (t: { min: number; max: number }) => (t.min === t.max ? hm(t.min) : `${hm(t.min)}–${hm(t.max)}`);
const within = (t: { min: number; max: number }, v: number | undefined) => v !== undefined && v >= t.min * (1 - TOL) && v <= t.max * (1 + TOL);
const hitoMin = (s: DayState, id: string) => {
  const h = s.hitos.find((x) => x.id === id);
  return h ? h.t / 60_000 : undefined;
};

function levels(s: DayState): string {
  return UPGRADES.map((u) => `${u.id.slice(0, 3)}${s.upgrades[u.id] ?? 0}`).join(' ');
}

function summary(s: DayState): string {
  const cur = CURRENCIES.filter((c) => s.unlockedCurrencies.includes(c.id)).map((c) => `${c.nombre.split(' ')[0].toLowerCase()} ${formatNumber(s.currencies[c.id])}`);
  return `Era ${ERAS[s.era].romano} · tramo ${String(s.zone + 1).padStart(3)} · −${Math.round(depthMeters(s))} m · bajas ${s.kills} · caídas ${s.deaths} · moneda ${formatNumber(s.totalGold)}${cur.length ? ' · ' + cur.join(' · ') : ''}`;
}

/**
 * Juega `totalMs` en trozos de `chunkMs` (≤ 60 s → detallada; > 60 s → rápida).
 * Las cartas se eligen al azar (con la semilla) en cuanto aparece la Encrucijada.
 */
function play(seed: number, chunkMs: number, verbose: boolean, onStep?: (s: DayState) => void): { s: DayState; realMs: number } {
  const s = createDay('sim', 0, seed);
  s.status = 'RUNNING';
  const picker = { rngState: hashString(`${seed}:simulador`) };
  const choose = () => {
    const p = s.pendingCrossroads;
    if (!p) return;
    const views = p.cards.map((c) => cardView(s, c));
    const i = Math.floor(nextFloat(picker) * views.length);
    if (verbose) {
      console.log(`${formatHMS(s.workedMs)}  ✦ ENCRUCIJADA de ${CROSSROADS_NAMES[p.tipo]}`);
      views.forEach((v, k) =>
        console.log(`            ${k === i ? '▶' : ' '} ${v.nombre} — ${v.subtitulo} [${v.etiquetas.join(', ')}] (${v.rareza})${v.oculto ? ' ???' : ''}`),
      );
    }
    applyChoice(s, i);
  };
  const t0 = performance.now();
  choose(); // Origen
  for (let done = 0; done < totalMs; done += chunkMs) {
    advance(s, Math.min(chunkMs, totalMs - done));
    choose();
    onStep?.(s);
  }
  return { s, realMs: performance.now() - t0 };
}

const MAX_HUECO_MIN = 12;

/** Mayor hueco sin novedades (sección 8) y contenido nuevo por hora (para comprobar las Horas Extra). */
function noveltyReport(s: DayState): void {
  const n = s.world.novedad;
  // El tramo final (desde la última novedad hasta el fin de la simulación) también cuenta.
  const gap = Math.max(n.maxGapMs, s.workedMs - n.lastMs) / 60_000;
  const gapOtras = Math.max(n.maxGapOtrasMs, s.workedMs - n.lastOtrasMs) / 60_000;
  const at = n.maxGapMs >= s.workedMs - n.lastMs ? n.maxGapAtMs : n.lastMs;
  console.log('\nNOVEDADES');
  console.log(`Mayor hueco sin novedades: ${gap.toFixed(1)} min (desde ${formatHMS(at)}) — objetivo ≤ ${MAX_HUECO_MIN} min: ${gap <= MAX_HUECO_MIN ? 'SÍ' : 'NO'}`);
  console.log(`  (sin contar criaturas nuevas: ${gapOtras.toFixed(1)} min)`);
  console.log(`Eventos: ${s.world.eventos.length} ocurridos, ${new Set(s.world.eventos).size} únicos de ${EVENTS.length} · rarezas vistas: ${s.world.rarezas.filter((r) => r.done).length}`);
  console.log(`Cadenas: ${s.world.cadenas.map((c) => `${CHAIN_BY_ID[c.id].nombre} ${c.parte}/${c.tiempos.length}${c.parte < c.tiempos.length ? ' (sin terminar)' : ''}`).join(' · ') || '—'}`);
  console.log(`Criaturas descubiertas: ${s.world.bestiario.length} combinaciones · modificadores vistos: ${s.world.modsVistos.length} · mutaciones: ${s.world.mutaciones.length} · artefactos: ${s.build.relics.length} · combos secretos: ${s.world.combos.length}`);

  const horas = Math.ceil(s.workedMs / 3_600_000);
  console.log('\nCONTENIDO NUEVO POR HORA');
  console.log(`${'Hora'.padEnd(7)} ${'Novedades'.padEnd(10)} ${'Criaturas nuevas'.padEnd(17)} Primeras veces (eventos, modificadores, sub-capas, hitos)`);
  const w = s.world;
  const firstEv = new Map<string, number>();
  w.eventos.forEach((id, i) => {
    if (!firstEv.has(id)) firstEv.set(id, w.eventosT[i]);
  });
  const inHour = (ms: number, h: number) => Math.floor(ms / 3_600_000) === h;
  for (let h = 0; h < horas; h++) {
    const ev = [...firstEv.values()].filter((ms) => inHour(ms, h)).length;
    const mods = w.modsVistosT.filter((ms) => inHour(ms, h)).length;
    const hitos = s.hitos.filter((x) => inHour(x.t, h) && /^(sub_|subhito|subumbral|ciclo|cadena|combo|era|ruta)/.test(x.id)).length;
    console.log(`${`${h}–${h + 1} h`.padEnd(7)} ${String(n.porHora[h] ?? 0).padEnd(10)} ${String(n.criaturasPorHora[h] ?? 0).padEnd(17)} ${ev} eventos nuevos · ${mods} modificadores nuevos · ${hitos} hitos/sub-capas/cadenas/combos`);
  }
}

function targetsTable(s: DayState): void {
  console.log('\nOBJETIVOS DE RITMO (sección 8, tolerancia ±15 %)');
  console.log(`${'Objetivo'.padEnd(34)} ${'Meta'.padEnd(11)} ${'Con ±15 %'.padEnd(11)} ${'Resultado'.padEnd(10)} ¿Cumple?`);
  for (const t of TARGETS) {
    const v = hitoMin(s, t.hito);
    console.log(
      `${t.nombre.padEnd(34)} ${range(t).padEnd(11)} ${`${hm(t.min * (1 - TOL))}–${hm(t.max * (1 + TOL))}`.padEnd(11)} ${(v === undefined ? 'no llegó' : hm(v)).padEnd(10)} ${within(t, v) ? 'SÍ' : 'NO'}`,
    );
  }
}

console.log(`LA JORNADA · simulador · ${hours} h · semilla ${baseSeed}\n`);

if (args.balance) {
  // Varias semillas con cartas al azar: reparto de cada objetivo y datos para ajustar.
  const n = Number(args.balance) || 20;
  const runs: DayState[] = [];
  const t0 = performance.now();
  // Lo Hondo (desde las 5 h): caídas y tramos de cada hora, para vigilar que ni sea un paseo ni un muro.
  const hondoCaidas: number[] = [];
  const hondoTramos: number[] = [];
  for (let i = 0; i < n; i++) {
    let hora = 1;
    let d0 = 0;
    let z0 = 0;
    runs.push(
      play(baseSeed + i, 1_000, false, (st) => {
        if (st.workedMs < hora * 3_600_000) return;
        if (hora > 5) {
          hondoCaidas.push(st.deaths - d0);
          hondoTramos.push(st.zone - z0);
        }
        hora++;
        d0 = st.deaths;
        z0 = st.zone;
      }).s,
    );
  }
  const stat = (vals: number[]) => {
    const v = [...vals].sort((a, b) => a - b);
    return v.length ? { min: v[0], med: v[Math.floor(v.length / 2)], max: v[v.length - 1] } : null;
  };
  console.log(`${n} semillas (${baseSeed}…${baseSeed + n - 1}), ${hours} h cada una, ${((performance.now() - t0) / 1000).toFixed(1)} s reales\n`);
  console.log(`${'Objetivo'.padEnd(34)} ${'Meta'.padEnd(11)} ${'Con ±15 %'.padEnd(11)} ${'mín'.padEnd(6)} ${'mediana'.padEnd(8)} ${'máx'.padEnd(6)} cumplen`);
  for (const t of TARGETS) {
    const vals = runs.map((s) => hitoMin(s, t.hito));
    const got = vals.filter((v): v is number => v !== undefined);
    const st = stat(got);
    const ok = vals.filter((v) => within(t, v)).length;
    console.log(
      `${t.nombre.padEnd(34)} ${range(t).padEnd(11)} ${`${hm(t.min * (1 - TOL))}–${hm(t.max * (1 + TOL))}`.padEnd(11)} ${(st ? hm(st.min) : '—').padEnd(6)} ${(st ? hm(st.med) : '—').padEnd(8)} ${(st ? hm(st.max) : '—').padEnd(6)} ${ok}/${n}`,
    );
  }
  console.log('\nDatos de apoyo (medianas, minutos):');
  for (let e = 1; e <= 4; e++) {
    const seen = stat(runs.map((s) => hitoMin(s, `jefe${e}_visto`)).filter((v): v is number => v !== undefined));
    const dead = stat(runs.map((s) => hitoMin(s, `jefe${e}`)).filter((v): v is number => v !== undefined));
    console.log(`  Umbral de la Era ${ERAS[e - 1].romano}: visto ${seen ? `${hm(seen.min)} / ${hm(seen.med)} / ${hm(seen.max)}` : '—'} · derrotado ${dead ? `${hm(dead.min)} / ${hm(dead.med)} / ${hm(dead.max)}` : '—'}`);
  }
  const gaps = runs.map((s) => Math.max(s.world.novedad.maxGapMs, s.workedMs - s.world.novedad.lastMs) / 60_000);
  const g = stat(gaps)!;
  console.log(`  Mayor hueco sin novedades (min): ${g.min.toFixed(1)} / ${g.med.toFixed(1)} / ${g.max.toFixed(1)} · cumplen ≤ ${MAX_HUECO_MIN} min: ${gaps.filter((x) => x <= MAX_HUECO_MIN).length}/${n}`);
  const ev = stat(runs.map((s) => new Set(s.world.eventos).size))!;
  console.log(`  Eventos únicos: ${ev.min} / ${ev.med} / ${ev.max}`);
  const fin = stat(runs.map((s) => s.zone + 1))!;
  const dth = stat(runs.map((s) => s.deaths))!;
  const hc = stat(hondoCaidas);
  const ht = stat(hondoTramos);
  if (hc && ht) console.log(`  Lo Hondo, por hora: caídas ${hc.min} / ${hc.med} / ${hc.max} (orientativo: mediana entre 3 y 20) · tramos ${ht.min} / ${ht.med} / ${ht.max}`);
  console.log(`  Tramo final: ${fin.min} / ${fin.med} / ${fin.max} · caídas: ${dth.min} / ${dth.med} / ${dth.max}`);
} else if (args.ritmo) {
  // Ritmo hora a hora (punto 2): ¿pasa en cada hora algo que se note? Cuenta lo «notable» (sucesos,
  // Encrucijadas, edificios nuevos, hitos, artefactos, mutaciones, mascotas) y el mayor hueco entre
  // dos cosas notables, más el avance, las mejoras compradas y las monedas que se quedan sin gastar.
  const n = Number(args.ritmo) || 20;
  const H = Math.ceil(hours);
  type Hour = { notables: number; hueco: number; eventos: number; cartas: number; edificios: number; niveles: number; mejoras: number; meta: number; tramos: number; caidas: number; otros: number; cur: Record<string, number> };
  const perSeed: Hour[][] = [];
  for (let i = 0; i < n; i++) {
    const marks: number[] = [];
    const hrs: Hour[] = Array.from({ length: H }, () => ({ notables: 0, hueco: 0, eventos: 0, cartas: 0, edificios: 0, niveles: 0, mejoras: 0, meta: 0, tramos: 0, caidas: 0, otros: 0, cur: {} }));
    let lastOtras = 0;
    let prev = { niv: 0, upg: 0, meta: 0, rel: 0, mut: 0, pets: 0, zone: 0, deaths: 0 };
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
    const { s } = play(baseSeed + i, 1_000, false, (st) => {
      const h = Math.min(H - 1, Math.floor((st.workedMs - 1) / 3_600_000));
      const cur = { niv: sum(st.base.buildings), upg: sum(st.upgrades), meta: sum(st.meta), rel: st.build.relics.length, mut: st.world.mutaciones.length, pets: st.pets.length, zone: st.zone, deaths: st.deaths };
      const r = hrs[h];
      r.niveles += cur.niv - prev.niv;
      r.mejoras += cur.upg - prev.upg;
      r.meta += cur.meta - prev.meta;
      r.tramos += cur.zone - prev.zone;
      r.caidas += cur.deaths - prev.deaths;
      const extra = cur.rel - prev.rel + (cur.mut - prev.mut) + (cur.pets - prev.pets);
      if (extra > 0) {
        r.otros += extra;
        marks.push(st.workedMs);
      }
      prev = cur;
      // Toda novedad que no sea una criatura (sinergias, Umbral a la vista…), como la cuenta el juego.
      if (st.world.novedad.lastOtrasMs !== lastOtras) {
        lastOtras = st.world.novedad.lastOtrasMs;
        marks.push(lastOtras);
      }
      if (st.workedMs % 3_600_000 < 1_000) for (const c of CURRENCIES) r.cur[c.id] = st.currencies[c.id];
    });
    for (const x of s.hitos) if (!x.id.startsWith('moneda_')) marks.push(x.t);
    s.world.eventosT.forEach((t) => {
      marks.push(t);
      hrs[Math.min(H - 1, Math.floor(t / 3_600_000))].eventos++;
    });
    for (const c of s.scheduledCrossroads) if (c.done && c.atMs > 0) {
      marks.push(c.atMs);
      hrs[Math.min(H - 1, Math.floor(c.atMs / 3_600_000))].cartas++;
    }
    for (const x of s.hitos) if (x.id.startsWith('edificio_')) hrs[Math.min(H - 1, Math.floor(x.t / 3_600_000))].edificios++;
    const uniq = [...new Set(marks)].sort((a, b) => a - b);
    let last = 0;
    for (const t of [...uniq, H * 3_600_000]) {
      const h = Math.min(H - 1, Math.floor(last / 3_600_000));
      hrs[h].hueco = Math.max(hrs[h].hueco, (t - last) / 60_000);
      if (t < H * 3_600_000) hrs[Math.min(H - 1, Math.floor(t / 3_600_000))].notables++;
      last = t;
    }
    perSeed.push(hrs);
  }
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const mx = (v: number[]) => Math.max(...v);
  console.log(`${n} semillas, ${H} h · medianas por hora (hueco: mediana / peor)\n`);
  console.log('Hora    Notables Hueco(min)  Sucesos Cartas Edif.nuevos Niv.Base Mejoras Ecos/Frag Otros Tramos Caídas  Monedas al final (mat · esen · ecos · frag)');
  for (let h = 0; h < H; h++) {
    const col = (k: keyof Omit<Hour, 'cur'>) => perSeed.map((x) => x[h][k] as number);
    const c = (id: string) => med(perSeed.map((x) => x[h].cur[id] ?? 0));
    console.log(
      `${`${h}–${h + 1}`.padEnd(7)} ${String(med(col('notables'))).padEnd(8)} ${`${med(col('hueco')).toFixed(0)} / ${mx(col('hueco')).toFixed(0)}`.padEnd(11)} ${String(med(col('eventos'))).padEnd(7)} ${String(med(col('cartas'))).padEnd(6)} ${String(med(col('edificios'))).padEnd(11)} ${String(med(col('niveles'))).padEnd(8)} ${String(med(col('mejoras'))).padEnd(7)} ${String(med(col('meta'))).padEnd(9)} ${String(med(col('otros'))).padEnd(5)} ${String(med(col('tramos'))).padEnd(6)} ${String(med(col('caidas'))).padEnd(7)} ${['materiales', 'esencia', 'ecos', 'fragmentos'].map((id) => formatNumber(c(id))).join(' · ')}`,
    );
  }
} else if (args.variety) {
  // Prueba de variedad: 10 días con semillas distintas deben compartir < 40 % de eventos en el mismo orden.
  const days = Array.from({ length: 10 }, (_, i) => play(baseSeed + i * 7919, 60_000 * 5, false).s.world.eventos);
  let worst = 0;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < days.length; i++) {
    for (let j = i + 1; j < days.length; j++) {
      const len = Math.min(days[i].length, days[j].length);
      let same = 0;
      for (let k = 0; k < len; k++) if (days[i][k] === days[j][k]) same++;
      const frac = len ? same / len : 0;
      worst = Math.max(worst, frac);
      sum += frac;
      pairs++;
    }
  }
  console.log(`10 días de ${hours} h · eventos por día: ${days.map((d) => d.length).join(', ')}`);
  console.log(`Eventos en común en la misma posición: media ${((sum / pairs) * 100).toFixed(1)} % · peor pareja ${(worst * 100).toFixed(1)} % — objetivo < 40 %: ${worst < 0.4 ? 'SÍ' : 'NO'}`);
} else if (args.compare) {
  const modes: [string, number][] = [
    ['detallada (ticks de 100 ms)', 1_000],
    ['rápida, trozos de 5 min', 300_000],
    ['rápida, trozos de 10 min', 600_000],
  ];
  for (const [name, chunk] of modes) {
    const { s, realMs } = play(baseSeed, chunk, false);
    console.log(`${name.padEnd(30)} ${formatHMS(s.workedMs)} · ${summary(s)} · ${realMs.toFixed(0)} ms reales`);
  }
  const { s } = play(baseSeed, 1_000, false);
  const t0 = performance.now();
  advance(s, 600_000);
  console.log(`\nCatch-up de 10 min sobre una partida de ${hours} h: ${(performance.now() - t0).toFixed(2)} ms reales`);
} else {
  console.log('LÍNEA DE TIEMPO (tiempo trabajado)');
  let lastZone = 0;
  let known = 1;
  let logged = -1;
  let hitos = 0;
  let nextHour = 3_600_000;
  const { s, realMs } = play(baseSeed, 1_000, true, (st) => {
    while (st.unlockedFamilies.length > known) {
      const f = FAMILY_BY_ID[st.unlockedFamilies[known++]];
      console.log(`${formatHMS(st.workedMs)}  ✚ nueva familia: ${f.nombre}`);
    }
    if (st.unlockedFamilies.length < known) known = st.unlockedFamilies.length;
    // Hitos: eras, Umbrales de era, monedas, edificios, equipo, mascotas.
    for (; hitos < st.hitos.length; hitos++) console.log(`${formatHMS(st.hitos[hitos].t)}  ★ ${st.hitos[hitos].text}`);
    // Sucesos de build tomados del registro: sinergias, revelaciones, evoluciones y auto-elecciones.
    for (const e of st.eventLog.slice(-25)) {
      if (e.t <= logged) continue;
      if (/^(Sinergia|\?\?\?|El Destino|◈|Artefacto|Mutación|Nueva mascota|Atajo|LORE|Recuerdo|Combo secreto revelado)|evoluciona/.test(e.text)) console.log(`${formatHMS(e.t)}  ◆ ${e.text}`);
    }
    logged = st.workedMs;
    if (st.zone !== lastZone) {
      lastZone = st.zone;
      if (!quiet) {
        const dps = totalDps(heroStats(st.upgrades, st.mods), st.mods);
        console.log(
          `${formatHMS(st.workedMs)}  tramo ${String(st.zone + 1).padStart(3)}  −${String(Math.round(depthMeters(st))).padStart(5)} m  DPS ${formatNumber(dps).padStart(7)}  caídas ${String(st.deaths).padStart(4)}  [${levels(st)}]`,
        );
      }
    }
    if (st.workedMs >= nextHour) {
      console.log(`────── ${nextHour / 3_600_000} h: ${summary(st)}`);
      nextHour += 3_600_000;
    }
  });
  console.log(`\nFINAL ${formatHMS(s.workedMs)}: ${summary(s)}`);
  console.log(`Sinergias: ${synergyStatus(s).map((x) => `${x.def.tag} ${x.count}${x.activos.length ? ` (${x.activos.map((l) => l.nombre).join(', ')})` : ''}`).join(' · ') || '—'}`);
  console.log(`Base: ${BUILDINGS.filter((b) => s.base.buildings[b.id]).map((b) => `${b.nombre} ${s.base.buildings[b.id]}`).join(' · ') || '—'}`);
  console.log(`Equipo: ${Object.values(s.equipment).filter(Boolean).map((e) => `${e!.nombre} (${e!.poder.toFixed(1)})`).join(' · ') || '—'} · Mascotas: ${s.pets.map((p) => `${p.id} nv ${p.level}`).join(', ') || '—'} · Pacto: ${s.build.pactId ?? '—'}`);
  console.log(`Condición del día: ${CONDITION_BY_ID[s.world.condicion].nombre} — ${CONDITION_BY_ID[s.world.condicion].texto}`);
  if (s.world.sub) console.log(`Sub-capa actual: ${s.world.sub.nombre}${s.world.sub.ciclo ? ` · Grado de Ciclo ${s.world.sub.ciclo}` : ''}`);
  targetsTable(s);
  noveltyReport(s);
  console.log(`\nSimulado en ${(realMs / 1000).toFixed(2)} s reales.`);
}
