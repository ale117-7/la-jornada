// Motor de sucesos: condición del día, eventos aleatorios, rarezas, cadenas, hitos de la ruta,
// sub-capas de Lo Hondo, Ciclos Invertidos y Mutaciones. Todo ocurre solo, por tiempo trabajado.
import { BAL } from '../data/balance';
import { CHAIN_A_MIN, CHAIN_B_FIRST_MIN, CHAIN_BY_ID, CHAINS } from '../data/chains';
import { COMBO_BY_ID, COMBOS } from '../data/combos';
import { COMPANION_BY_ID } from '../data/companions';
import { CURRENCY_BY_ID } from '../data/currencies';
import { DAY_CONDITIONS } from '../data/dayConditions';
import type { Efx } from '../data/efx';
import { EVENT_BY_ID, EVENT_RULES, EVENTS, RARITIES, type EventDef } from '../data/events';
import { FAMILY_BY_ID } from '../data/families';
import { MODIFIERS } from '../data/modifiers';
import { MUTATION_MAX, MUTATIONS } from '../data/mutations';
import { PET_BY_ID, PETS } from '../data/pets';
import { GRADO_NUM, RELICS } from '../data/relics';
import {
  CICLO_HORAS,
  CICLO_UMBRALES,
  CICLOS_DESDE_HORA,
  LORE,
  MECHANIC_BY_ID,
  MECHANICS,
  RECUERDOS,
  RECUERDOS_CADA,
  ROUTE_HITOS,
  SUBLAYER_TEMPLATES,
  SUBLAYERS,
  type SubLayerDef,
} from '../data/route';
import { addCurrency } from './base';
import { creatureAtk, creatureGold, creatureHp, zoneGold } from './formulas';
import { novedad, pushHito, pushLog } from './log';
import { describeEfectos } from './mods';
import { hashString, nextFloat, type RngHolder } from './rng';
import type { Creature, DayState, WorldState } from './types';
import { breathPhase, conditionOf, hasMechanic } from './worldMods';

const MIN = 60_000;
const HOUR = 3_600_000;
const rnd = (s: DayState) => nextFloat(s.world);
const between = (s: DayState, a: number, b: number) => a + rnd(s) * (b - a);
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// ---------- creación ----------

export function createWorld(seed: number): WorldState {
  const w: WorldState = {
    rngState: hashString(`${seed}:mundo`),
    condicion: 'normal',
    nextEventMs: EVENT_RULES.primeroMin * MIN,
    eventos: [],
    eventosT: [],
    rarezas: [],
    buffs: [],
    permanentes: [],
    pendientes: [],
    cadenas: [],
    rutaHechos: [],
    capaGarantizada: false,
    sub: null,
    mutaciones: [],
    nextMutacionMs: 0,
    flags: { revelaOculto: false, cuatroCartas: false, anuncioTemprano: false, espejo: false },
    combos: [],
    combosRevelados: [],
    bestiario: [],
    modsVistos: [],
    modsVistosT: [],
    recuerdos: 0,
    lore: 0,
    pausaMs: 0,
    salto: 0,
    presion: 0,
    respiracion: 0,
    ultimaFiesta: 0,
    accMs: 0,
    dirty: false,
    novedad: { lastMs: 0, maxGapMs: 0, maxGapAtMs: 0, lastOtrasMs: 0, maxGapOtrasMs: 0, porHora: [], criaturasPorHora: [] },
  };
  // Condición del día (se anuncia en la pantalla "Nueva Jornada").
  let r = nextFloat(w) * DAY_CONDITIONS.reduce((a, c) => a + c.peso, 0);
  for (const c of DAY_CONDITIONS) {
    r -= c.peso;
    if (r < 0) {
      w.condicion = c.id;
      break;
    }
  }
  // Rarezas: cada una tiene ≤ 2 % de probabilidad de ocurrir hoy, a una hora al azar.
  for (const e of RARITIES) {
    if (nextFloat(w) < EVENT_RULES.rarezaProb) w.rarezas.push({ id: e.id, atMs: Math.round((30 + nextFloat(w) * 450) * MIN), done: false });
  }
  return w;
}

/** Al elegir el Origen se sortean las 2–3 cadenas del día (según la corriente inicial). */
export function startChains(s: DayState): void {
  const w = s.world;
  if (w.cadenas.length) return;
  const pool = CHAINS.filter((c) => c.corriente.includes('*') || (s.corriente && c.corriente.includes(s.corriente)));
  const n = rnd(s) < 0.5 ? 2 : 3;
  for (let i = 0; i < n && pool.length; i++) {
    const def = pool.splice(Math.floor(rnd(s) * pool.length), 1)[0];
    let prev = 0;
    const tiempos = def.partes.map((p, k) => {
      let min = between(s, p.ventanaMin[0], p.ventanaMin[1]);
      // La Cadena A sigue los hitos de la ruta; la B empieza a las 3:00.
      if (i === 0 && k < CHAIN_A_MIN.length && def.partes.length <= CHAIN_A_MIN.length + 1) min = CHAIN_A_MIN[k];
      if (i === 1 && k === 0) min = CHAIN_B_FIRST_MIN;
      prev = Math.max(prev + 10, min);
      return Math.round(prev * MIN);
    });
    w.cadenas.push({ id: def.id, parte: 0, tiempos });
  }
}

// ---------- aplicar efectos ----------

/** Moneda que suelta una criatura normal del tramo actual (base para premios en moneda). */
function goldUnit(s: DayState): number {
  return zoneGold(s.zone) * s.mods.oroMult;
}

export function grantRelic(s: DayState, gradoMin = 1): void {
  const free = RELICS.filter((r) => !s.build.relics.includes(r.id));
  if (!free.length) return;
  const good = free.filter((r) => GRADO_NUM[r.grado] >= gradoMin);
  const pool = good.length ? good : free;
  const def = pool[Math.floor(rnd(s) * pool.length)];
  s.build.relics.push(def.id);
  novedad(s);
  pushLog(s, `Artefacto hallado (${def.grado}): ${def.nombre} — ${def.texto} ${describeEfectos(def.efectos).join(', ')}.`);
  s.world.dirty = true;
}

export function grantMutation(s: DayState, buena?: boolean): void {
  const w = s.world;
  const pool = MUTATIONS.filter((m) => !w.mutaciones.includes(m.id) && (buena === undefined || m.buena === buena));
  if (!pool.length) return;
  const def = pool[Math.floor(rnd(s) * pool.length)];
  if (w.mutaciones.length >= MUTATION_MAX) w.mutaciones.shift();
  w.mutaciones.push(def.id);
  novedad(s);
  pushLog(s, `Mutación: ${def.nombre}. ${def.texto} ${describeEfectos(def.efectos).join(', ')}.`);
  w.dirty = true;
}

function grantPet(s: DayState): void {
  const pool = PETS.filter((p) => !s.pets.some((x) => x.id === p.id));
  if (!pool.length) return;
  const def = pool[Math.floor(rnd(s) * pool.length)];
  s.pets.push({ id: def.id, level: 1 });
  novedad(s);
  pushLog(s, `Nueva mascota: ${PET_BY_ID[def.id].nombre}. ${def.texto}`);
  s.world.dirty = true;
}

/** Criatura especial en el tramo actual: mini-jefe, jefe errante o Umbral de sub-capa. */
export function spawnElite(s: DayState, nombre: string, hp: number, atk: number, premio?: Efx): void {
  const famId = s.unlockedFamilies[0];
  if (!famId) return;
  const fam = FAMILY_BY_ID[famId];
  const last = s.creatures[s.creatures.length - 1];
  const x = Math.min(BAL.ZONE_LENGTH_M - 4, Math.max(s.hero.x + 60, (last && !last.boss ? last.x : 0) + 15));
  const maxHp = (creatureHp(s.zone, fam) / fam.hpMult) * hp * s.mods.criaturaVidaMult;
  const c: Creature = {
    familyId: famId,
    x,
    hp: maxHp,
    maxHp,
    atk: (creatureAtk(s.zone, fam) / fam.atkMult) * atk * s.mods.criaturaAtkMult,
    gold: (creatureGold(s.zone, fam) / fam.goldMult) * 5,
    atkTimerMs: fam.atkIntervalMs,
    nombre,
    elite: true,
    premio,
    size: 1.9,
  };
  s.creatures.push(c);
  s.creatures.sort((a, b) => a.x - b.x);
}

/** Interpreta un efecto de suceso. `mag` escala cantidades y duraciones (Día Silencioso). */
export function applyEfx(s: DayState, e: Efx, nombre: string, mag = 1): void {
  const w = s.world;
  switch (e.t) {
    case 'buff':
      w.buffs.push({ id: `${nombre}:${Math.round(s.workedMs)}:${w.buffs.length}`, nombre, efectos: e.efectos, untilMs: s.workedMs + e.min * mag * MIN, visual: e.visual });
      w.dirty = true;
      break;
    case 'oro': {
      const g = e.k * mag * goldUnit(s);
      s.gold = Math.max(0, s.gold + g);
      if (g > 0) s.totalGold += g;
      break;
    }
    case 'moneda':
      if (s.unlockedCurrencies.includes(e.id)) addCurrency(s, e.id, e.n * mag);
      else applyEfx(s, { t: 'oro', k: e.n * 0.3 }, nombre, mag); // aún no se conoce esa moneda
      break;
    case 'tramos':
      w.salto += e.n;
      break;
    case 'artefacto':
      grantRelic(s, e.gradoMin);
      break;
    case 'mutacion':
      grantMutation(s, e.buena);
      break;
    case 'mascota':
      grantPet(s);
      break;
    case 'elite':
      spawnElite(s, e.nombre, e.hp, e.atk, e.premio);
      break;
    case 'pausa':
      w.pausaMs += e.seg * 1000;
      break;
    case 'permanente':
      w.permanentes.push(e.efectos);
      w.dirty = true;
      break;
    case 'azar':
      applyEfx(s, rnd(s) < e.p ? e.a : e.b, nombre, mag);
      break;
    case 'varios':
      for (const x of e.lista) applyEfx(s, x, nombre, mag);
      break;
    case 'despues':
      w.pendientes.push({ atMs: s.workedMs + e.min * MIN, efecto: e.efecto, texto: e.texto ? `${nombre}: ${e.texto}` : undefined });
      break;
    case 'flag':
      if (e.id === 'presagio') pushLog(s, `Presagio: ${presagio(s)}`);
      else w.flags[e.id] = true;
      break;
    case 'combo': {
      const pool = COMBOS.filter((c) => !w.combos.includes(c.id) && !w.combosRevelados.includes(c.id));
      if (pool.length) {
        const c = pool[Math.floor(rnd(s) * pool.length)];
        w.combosRevelados.push(c.id);
        pushLog(s, `Combo secreto revelado: ${c.tags[0]} + ${c.tags[1]} = «${c.nombre}» (${describeEfectos(c.efectos).join(', ')}).`);
      }
      break;
    }
    case 'cadena': {
      const ch = w.cadenas.find((c) => c.id === e.id && c.parte < c.tiempos.length);
      if (ch) fireChainPart(s, ch);
      else if (e.si_no) applyEfx(s, e.si_no, nombre, mag);
      break;
    }
    case 'evolucionar': {
      const c = s.build.companions.find((x) => !x.evolved);
      if (c) {
        c.evolved = true;
        pushLog(s, `${COMPANION_BY_ID[c.id].nombre} evoluciona: ${COMPANION_BY_ID[c.id].evolucion.nombre}.`);
        w.dirty = true;
      }
      break;
    }
    case 'lore':
      pushLog(s, w.lore < LORE.length ? `LORE (${w.lore + 1}/${LORE.length}): ${LORE[w.lore]}` : RECUERDOS[w.lore % RECUERDOS.length]);
      w.lore++;
      break;
    case 'nada':
      break;
  }
}

function presagio(s: DayState): string {
  const hora = Math.floor(s.workedMs / HOUR) + 1;
  const next = SUBLAYERS.find((x) => x.hora >= Math.max(5, hora));
  return next ? `más abajo espera «${next.nombre}» (${MECHANIC_BY_ID[next.mecanica].nombre}).` : 'más abajo todo se repite, pero al revés.';
}

// ---------- eventos ----------

function fireEvent(s: DayState, def: EventDef): void {
  const w = s.world;
  w.eventos.push(def.id);
  w.eventosT.push(Math.round(s.workedMs));
  novedad(s);
  pushLog(s, `◈ ${def.categoria === 'Rarezas' ? 'RAREZA' : 'Evento'} · ${def.nombre}: ${def.textoLog}`);
  applyEfx(s, def.efecto, def.nombre, conditionOf(s).eventoMagnitud ?? 1);
}

function pickEvent(s: DayState): EventDef | null {
  const w = s.world;
  const cond = conditionOf(s);
  const recientes = [...new Set([...w.eventos].reverse())].slice(0, EVENT_RULES.sinRepetir);
  const first = w.eventos.length === 0;
  // Primer Evento de Capa garantizado al llegar a las 4:00 (si ya se está en la Era IV).
  const forceCapa = !w.capaGarantizada && s.era >= 3 && s.workedMs >= EVENT_RULES.primeraCapaMin * MIN;
  const ok = (e: EventDef) =>
    e.categoria !== 'Rarezas' &&
    e.eraMin <= s.era + 1 &&
    (e.corriente === '*' || e.corriente === s.corriente) &&
    !(e.unaVezPorDia && w.eventos.includes(e.id)) &&
    !(e.requiereCompanero && s.build.companions.length === 0) &&
    !recientes.includes(e.id);
  let pool = EVENTS.filter(ok);
  if (first) pool = pool.filter((e) => e.categoria === 'Encuentros');
  if (forceCapa) {
    const capa = pool.filter((e) => e.capa);
    if (capa.length) pool = capa;
    w.capaGarantizada = true;
  }
  if (!pool.length) return null;
  const peso = (e: EventDef) => e.peso * (e.clase === 'clima' ? (cond.climaPeso ?? 1) : 1) * (e.clase === 'mercader' ? (cond.mercaderPeso ?? 1) : 1);
  let r = rnd(s) * pool.reduce((a, e) => a + peso(e), 0);
  for (const e of pool) {
    r -= peso(e);
    if (r < 0) return e;
  }
  return pool[pool.length - 1];
}

// ---------- cadenas ----------

function fireChainPart(s: DayState, ch: WorldState['cadenas'][number]): void {
  const def = CHAIN_BY_ID[ch.id];
  const part = def.partes[ch.parte];
  ch.parte++;
  pushHito(s, `cadena_${ch.id}_${ch.parte}`, `📜 ${def.nombre} (${ch.parte}/${def.partes.length}): ${part.textoLog}`);
  applyEfx(s, part.efecto, def.nombre);
}

// ---------- sub-capas de Lo Hondo y Ciclos Invertidos ----------

function enterSubLayer(s: DayState, hora: number): void {
  const w = s.world;
  const prevCiclo = w.sub?.ciclo ?? 0;
  if (hora < CICLOS_DESDE_HORA) {
    const def = [...SUBLAYERS].reverse().find((x) => x.hora <= hora) ?? SUBLAYERS[0];
    w.sub = { hora, nombre: def.nombre, mecanicas: [def.mecanica], anomalia: null, ciclo: 0, umbralDone: false, hitosDone: 0 };
    const m = MECHANIC_BY_ID[def.mecanica];
    pushHito(s, `sub_${hora}`, `SUB-CAPA · ${def.nombre.toUpperCase()} — ${m.nombre}: ${m.texto}`);
  } else {
    // Ciclos Invertidos: cada hora, una sub-capa procedural con 2 mecánicas y 1 Anomalía.
    const r: RngHolder = { rngState: hashString(`${s.seed}:ciclo:${hora}`) };
    const tpl = SUBLAYER_TEMPLATES[Math.floor(nextFloat(r) * SUBLAYER_TEMPLATES.length)];
    const nombre = `${tpl.lugar} ${tpl.de[Math.floor(nextFloat(r) * tpl.de.length)]}`;
    const pool = MECHANICS.filter((m) => m.id !== 'calma');
    const a = pool.splice(Math.floor(nextFloat(r) * pool.length), 1)[0];
    const b = pool[Math.floor(nextFloat(r) * pool.length)];
    const anomalias = MODIFIERS.filter((m) => m.horaMin !== undefined);
    const anomalia = anomalias[Math.floor(nextFloat(r) * anomalias.length)];
    const ciclo = Math.floor((hora - CICLOS_DESDE_HORA) / CICLO_HORAS) + 1;
    w.sub = { hora, nombre, mecanicas: [a.id, b.id], anomalia: anomalia.id, ciclo, umbralDone: false, hitosDone: 0 };
    if (ciclo > prevCiclo) {
      pushHito(s, `ciclo_${ciclo}`, ciclo === 1 ? 'CICLOS INVERTIDOS: todo se ve al revés. El Descensor cae hacia arriba.' : `GRADO DE CICLO ${ROMANOS[ciclo - 1] ?? ciclo}: el mundo invertido da otra vuelta.`);
    }
    pushHito(s, `sub_${hora}`, `SUB-CAPA · ${nombre.toUpperCase()} (invertida) — ${a.nombre} + ${b.nombre} · Anomalía: criaturas «${anomalia.adj[0]}»`);
  }
  w.dirty = true;
}

function subLayerEvents(s: DayState): void {
  const sub = s.world.sub!;
  const def: SubLayerDef | undefined = sub.ciclo === 0 ? SUBLAYERS.find((x) => x.nombre === sub.nombre) : undefined;
  const hitos = def?.hitos ?? [];
  while (sub.hitosDone < hitos.length && s.workedMs >= hitos[sub.hitosDone].atMin * MIN) {
    const h = hitos[sub.hitosDone++];
    pushHito(s, `subhito_${sub.hora}_${sub.hitosDone}`, `⚑ ${h.texto}`);
    if (h.efecto) applyEfx(s, h.efecto, sub.nombre);
  }
  // Umbral con nombre de la sub-capa (procedural en los Ciclos Invertidos, hacia el minuto 50).
  const umbral = def ? def.umbral : sub.ciclo > 0 ? { atMin: sub.hora * 60 + 50, nombre: `${CICLO_UMBRALES[sub.hora % CICLO_UMBRALES.length]} de ${sub.nombre.split(' ').slice(-1)[0]}` } : undefined;
  if (umbral && !sub.umbralDone && s.workedMs >= umbral.atMin * MIN) {
    sub.umbralDone = true;
    // El duelo final contra el Rival sustituye al Alcalde de Polvo si esa cadena está activa.
    if (def?.hora === 12 && s.world.cadenas.some((c) => c.id === 'rival')) return;
    pushHito(s, `subumbral_${sub.hora}`, `☠ Umbral de sub-capa: ${umbral.nombre}.`);
    spawnElite(s, umbral.nombre, 90, 4, { t: 'varios', lista: [{ t: 'moneda', id: 'fragmentos', n: 25 }, { t: 'oro', k: 100 }] });
  }
}

// ---------- avance por tiempo ----------

/**
 * Procesa todo lo que depende del reloj. Se acumula y actúa una vez por segundo trabajado.
 * Devuelve true si cambiaron los modificadores de la build.
 */
export function worldAdvance(s: DayState, dtMs: number): boolean {
  const w = s.world;
  w.accMs += dtMs;
  if (w.accMs >= 1000) {
    w.accMs = 0;
    const t = s.workedMs;
    const cond = conditionOf(s);

    // Hitos fijos de la ruta.
    for (const h of ROUTE_HITOS) {
      if (w.rutaHechos.includes(h.id) || t < h.atMin * MIN || s.era + 1 < (h.eraMin ?? 1)) continue;
      w.rutaHechos.push(h.id);
      pushHito(s, h.id, `⚑ ${h.texto}`);
      if (h.efecto) applyEfx(s, h.efecto, 'Ruta');
    }

    // Efectos temporales que terminan y efectos aplazados que llegan.
    const alive = w.buffs.filter((b) => b.untilMs > t);
    if (alive.length !== w.buffs.length) {
      w.buffs = alive;
      w.dirty = true;
    }
    for (const p of w.pendientes.filter((x) => x.atMs <= t)) {
      if (p.texto) pushLog(s, p.texto);
      applyEfx(s, p.efecto, p.texto?.split(':')[0] ?? 'Suceso');
    }
    w.pendientes = w.pendientes.filter((x) => x.atMs > t);

    // Evento aleatorio cada 8–20 min.
    // …o antes, si llevan demasiado sin pasar nada nuevo.
    if (t >= w.nextEventMs || t - w.novedad.lastOtrasMs >= EVENT_RULES.maxSinNovedadMin * MIN) {
      const def = pickEvent(s);
      if (def) fireEvent(s, def);
      const [a, b] = EVENT_RULES.intervaloMin;
      w.nextEventMs = t + between(s, a, b) * (cond.eventosIntervalo ?? 1) * MIN;
    }
    for (const r of w.rarezas) {
      if (!r.done && t >= r.atMs) {
        r.done = true;
        fireEvent(s, EVENT_BY_ID[r.id]);
      }
    }

    // Cadenas.
    for (const ch of w.cadenas) {
      if (ch.parte < ch.tiempos.length && t >= ch.tiempos[ch.parte]) fireChainPart(s, ch);
    }

    // Mutaciones por Presión (desde la Era III).
    if (s.era >= 2) {
      if (w.nextMutacionMs === 0) w.nextMutacionMs = t + 20 * MIN;
      if (t >= w.nextMutacionMs) {
        w.nextMutacionMs = t + 20 * MIN;
        if (rnd(s) < (w.presion / 100) * 0.7 * (cond.mutacionMult ?? 1)) grantMutation(s);
      }
    }

    // Día de la Fiesta Abajo: la Base celebra cada hora.
    const hora = Math.floor(t / HOUR);
    if (cond.fiesta && hora > w.ultimaFiesta && s.base.buildings.montacargas) {
      w.ultimaFiesta = hora;
      pushLog(s, 'Fiesta en la Base: banderines, música y más producción durante 10 min.');
      applyEfx(s, { t: 'buff', min: 10, efectos: { produccionMult: 1.5 }, visual: 'brillo' }, 'Fiesta Abajo');
    }

    // Lo Hondo: una sub-capa por hora.
    if (s.era >= 4) {
      if (!w.sub || w.sub.hora !== hora) enterSubLayer(s, hora);
      subLayerEvents(s);
      if (hasMechanic(s, 'respiracion') && breathPhase(s) !== w.respiracion) {
        w.respiracion = breathPhase(s);
        w.dirty = true;
      }
    }
  }
  const changed = w.dirty;
  w.dirty = false;
  return changed;
}

/** ms hasta el próximo suceso ligado al reloj (para trocear la simulación rápida). */
export function msToNextWorldEvent(s: DayState): number {
  const w = s.world;
  const t = s.workedMs;
  const times: number[] = [w.nextEventMs, w.novedad.lastOtrasMs + EVENT_RULES.maxSinNovedadMin * MIN];
  for (const r of w.rarezas) if (!r.done) times.push(r.atMs);
  for (const p of w.pendientes) times.push(p.atMs);
  for (const b of w.buffs) times.push(b.untilMs);
  for (const c of w.cadenas) if (c.parte < c.tiempos.length) times.push(c.tiempos[c.parte]);
  for (const h of ROUTE_HITOS) if (!w.rutaHechos.includes(h.id) && s.era + 1 >= (h.eraMin ?? 1)) times.push(h.atMin * MIN);
  if (s.era >= 4) {
    times.push((Math.floor(t / HOUR) + 1) * HOUR);
    if (hasMechanic(s, 'respiracion')) times.push((Math.floor(t / 30_000) + 1) * 30_000);
  }
  // +1 s: los sucesos se procesan con granularidad de un segundo.
  return Math.max(1000, Math.min(...times) - t + 1000);
}

/** Al derrotar a una criatura: premio de las especiales, Recuerdos y el eco del Día del Eco. */
export function onKill(s: DayState, c: Creature): void {
  if (c.premio) {
    pushLog(s, `${c.nombre} cae.`);
    applyEfx(s, c.premio, c.nombre ?? 'Criatura');
  }
  if (hasMechanic(s, 'recuerdos') && ++s.world.recuerdos % RECUERDOS_CADA === 0) {
    pushLog(s, RECUERDOS[Math.floor(s.world.recuerdos / RECUERDOS_CADA) % RECUERDOS.length]);
  }
  if (c.boss && conditionOf(s).ecoUmbral) {
    applyEfx(s, { t: 'buff', min: 5, efectos: { ataqueMult: 1.3 } }, `Eco de ${c.nombre}`);
    pushLog(s, `Día del Eco: ${c.nombre} reaparece como fantasma aliado durante 5 min.`);
  }
}

/** Nombre legible de una moneda (para textos de premios). */
export const currencyName = (id: keyof typeof CURRENCY_BY_ID) => CURRENCY_BY_ID[id].nombre;
export { COMBO_BY_ID };
