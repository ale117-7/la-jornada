// La Base Colgante y todo lo que cuelga de ella: producción, oficios (equipo), mascotas,
// bendiciones y las mejoras de Ecos y Fragmentos. Todo se construye y se compra solo.
import { BAL } from '../data/balance';
import {
  BLESSING_BY_ID,
  BLESSINGS,
  BUILDING_COST_GROWTH,
  BUILDINGS,
  GRADOS,
  SLOT_BY_ID,
  SLOTS,
  type BuildingDef,
} from '../data/buildings';
import { CURRENCIES, type CurrencyId } from '../data/currencies';
import { META_UPGRADES, type MetaUpgradeDef } from '../data/metaUpgrades';
import { PET_BY_ID, PET_MAX_LEVEL, PETS } from '../data/pets';
import type { Tag } from '../data/tags';
import { zoneGold } from './formulas';
import { pushHito, pushLog } from './log';
import { scaleEfectos, type Efectos } from './mods';
import { nextFloat } from './rng';
import type { DayState } from './types';

const lvl = (s: DayState, id: string) => s.base.buildings[id] ?? 0;

export function buildingCost(b: BuildingDef, level: number): number {
  return b.coste * Math.pow(BUILDING_COST_GROWTH, level);
}
export function metaCost(m: MetaUpgradeDef, level: number): number {
  return m.coste * Math.pow(m.costeGrowth, level);
}
export function petLevelCost(level: number): number {
  return BAL.PET_LEVEL_COST * Math.pow(BAL.PET_LEVEL_GROWTH, level - 1);
}
/** Nidos disponibles según el nivel del Criadero. */
export function petSlots(s: DayState): number {
  const n = lvl(s, 'criadero');
  return n === 0 ? 0 : Math.min(4, 1 + Math.floor(n / 3));
}

/** Efectos que aportan la Base, el equipo, las mascotas, las mejoras y la bendición activa. */
export function baseEfectos(s: DayState): Efectos[] {
  const out: Efectos[] = [];
  for (const b of BUILDINGS) {
    const n = lvl(s, b.id);
    if (n > 0 && b.efectos) out.push(scaleEfectos(b.efectos, n));
  }
  for (const slot of SLOTS) {
    const it = s.equipment[slot.id];
    if (it) out.push(scaleEfectos(slot.efectos, it.poder));
  }
  for (const p of s.pets) out.push(scaleEfectos(PET_BY_ID[p.id].efectos, p.level));
  for (const m of META_UPGRADES) {
    const n = s.meta[m.id] ?? 0;
    if (n > 0) out.push(scaleEfectos(m.efectos, n));
  }
  if (s.base.blessing) out.push(BLESSING_BY_ID[s.base.blessing.id].efectos);
  return out;
}

/** Desbloquea las monedas de la era actual. */
export function unlockCurrencies(s: DayState): void {
  for (const c of CURRENCIES) {
    if (s.era + 1 >= c.era && !s.unlockedCurrencies.includes(c.id)) {
      s.unlockedCurrencies.push(c.id);
      pushHito(s, `moneda_${c.id}`, `¡Algo nuevo apareció: ${c.nombre}! (${c.uso})`);
    }
  }
}

export function addCurrency(s: DayState, id: CurrencyId, amount: number): void {
  if (!s.unlockedCurrencies.includes(id)) return;
  s.currencies[id] += id === 'ecos' ? amount * s.mods.ecosMult : amount;
}

/**
 * Avanza la Base `dtMs` de tiempo trabajado: producción, oficios, mascotas y bendiciones.
 * Devuelve true si cambió algo que afecta a los modificadores de la build.
 */
export function baseAdvance(s: DayState, dtMs: number): boolean {
  const b = s.base;
  b.accMs += dtMs;
  if (b.accMs < 1000) return false;
  const ms = b.accMs;
  b.accMs = 0;
  let changed = false;

  // El montacargas llega solo: nace la Base Colgante.
  if (lvl(s, 'montacargas') === 0) {
    if (s.workedMs < BAL.MONTACARGAS_MS) return false;
    b.buildings.montacargas = 1;
    pushHito(s, 'base', '¡Algo nuevo apareció: el Montacargas! Nace la Base Colgante.');
  }

  // Producción pasiva.
  const prod = s.mods.produccionMult * (ms / 60_000);
  for (const def of BUILDINGS) {
    const n = lvl(s, def.id);
    if (n === 0 || !def.produce) continue;
    const amount = def.produce.porMin * n * prod;
    if (def.produce.moneda === 'oro') {
      // Escala con la moneda de una criatura del tramo actual.
      const g = amount * zoneGold(s.zone) * s.mods.oroMult;
      s.gold += g;
      s.totalGold += g;
    } else addCurrency(s, def.produce.moneda, amount);
  }

  // Oficios: cada taller fabrica una pieza de su ranura; la IA la equipa si su poder es mayor.
  for (const def of BUILDINGS) {
    const n = lvl(s, def.id);
    if (n === 0 || !def.oficio) continue;
    const slot = def.oficio.slot;
    b.craftMs[slot] = Math.min(BAL.CRAFT_MS, b.craftMs[slot] + ms);
    const cost = BAL.CRAFT_COST * n;
    if (b.craftMs[slot] < BAL.CRAFT_MS || s.currencies.esencia < cost) continue;
    b.craftMs[slot] = 0;
    s.currencies.esencia -= cost;
    const sd = SLOT_BY_ID[slot];
    const poder = n * (0.8 + 0.4 * nextFloat(s));
    const nombre = `${sd.piezas[Math.floor(nextFloat(s) * sd.piezas.length)]} ${GRADOS[Math.min(n, GRADOS.length - 1)]}`;
    const current = s.equipment[slot];
    if (!current || poder > current.poder) {
      s.equipment[slot] = { nombre, grado: n, poder };
      pushLog(s, `${def.oficio.nombre}: fabricó ${nombre} (poder ${poder.toFixed(1)}) y el Descensor se lo equipa.`);
      if (!current) pushHito(s, `equipo_${slot}`, `¡Algo nuevo apareció: equipo fabricado (${sd.nombre})!`);
      changed = true;
    }
  }

  // Mascotas: la primera nace gratis al construir el Criadero.
  if (petSlots(s) > 0 && s.pets.length === 0) {
    hatch(s);
    changed = true;
  }

  // Bendiciones del Santuario.
  const santuario = lvl(s, 'santuario');
  if (b.blessing && s.workedMs >= b.blessing.untilMs) {
    b.blessing = null;
    changed = true;
  }
  if (santuario > 0 && !b.blessing && s.workedMs >= b.nextBlessingMs) {
    const def = BLESSINGS[Math.floor(nextFloat(s) * BLESSINGS.length)];
    b.blessing = { id: def.id, untilMs: s.workedMs + BAL.BLESSING_MS };
    b.nextBlessingMs = s.workedMs + BAL.BLESSING_EVERY_MS - santuario * 60_000;
    pushLog(s, `El Santuario concede la ${def.nombre} durante 10 min.`);
    changed = true;
  }
  return changed;
}

/** Esencia que se reserva para la próxima pieza de los talleres y la próxima compra de mascota. */
function reservaEsencia(s: DayState): number {
  const craft = Math.max(0, ...BUILDINGS.filter((d) => d.oficio).map((d) => BAL.CRAFT_COST * lvl(s, d.id)));
  if (s.pets.length > 0 && s.pets.length < petSlots(s)) return craft + BAL.PET_HATCH_COST * s.pets.length;
  const pet = s.pets.filter((p) => p.level < PET_MAX_LEVEL).sort((a, b) => a.level - b.level)[0];
  return craft + (pet ? petLevelCost(pet.level) : 0);
}

function hatch(s: DayState): void {
  const owned = s.pets.map((p) => p.id);
  const pool = PETS.filter((p) => !owned.includes(p.id));
  if (!pool.length) return;
  const def = pool[Math.floor(nextFloat(s) * pool.length)];
  s.pets.push({ id: def.id, level: 1 });
  pushHito(s, `mascota_${s.pets.length}`, `Nace una mascota en el Criadero: ${def.nombre}. ${def.texto}`);
}

/**
 * IA de la Base (7.4): hace UNA compra si puede, por este orden: edificio con mejor
 * prioridad/coste (más si comparte etiqueta con la build), mejoras de Ecos y Fragmentos, mascotas.
 * Devuelve true si compró algo.
 */
export function baseSpend(s: DayState, tags: Set<Tag>): boolean {
  if (lvl(s, 'montacargas') === 0) return false;

  let best: { def: BuildingDef; cost: number; score: number } | null = null;
  for (const def of BUILDINGS) {
    const n = lvl(s, def.id);
    if (def.era > s.era + 1 || n >= def.maxNivel) continue;
    const cost = buildingCost(def, n);
    if (cost > s.currencies.materiales) continue;
    const score = (def.prioridad * (def.etiqueta && tags.has(def.etiqueta) ? 1.5 : 1) * (n === 0 ? 2 : 1)) / cost;
    if (!best || score > best.score) best = { def, cost, score };
  }
  if (best) {
    const n = lvl(s, best.def.id);
    s.currencies.materiales -= best.cost;
    s.base.buildings[best.def.id] = n + 1;
    if (n === 0) pushHito(s, `edificio_${best.def.id}`, `La Base crece: ${best.def.nombre}. ${best.def.texto}`);
    return true;
  }

  for (const m of META_UPGRADES) {
    const n = s.meta[m.id] ?? 0;
    if (m.maxNivel !== undefined && n >= m.maxNivel) continue;
    if ((m.eraMin ?? 1) > s.era + 1) continue;
    const cost = metaCost(m, n);
    // La Esencia se guarda antes para el equipo y las mascotas.
    if (cost > s.currencies[m.moneda] - (m.moneda === 'esencia' ? reservaEsencia(s) : 0)) continue;
    // Se compra la más barata disponible de su moneda: reparte los niveles.
    const cheaper = META_UPGRADES.some(
      (o) => o !== m && o.moneda === m.moneda && (o.maxNivel === undefined || (s.meta[o.id] ?? 0) < o.maxNivel) && metaCost(o, s.meta[o.id] ?? 0) < cost,
    );
    if (cheaper) continue;
    s.currencies[m.moneda] -= cost;
    s.meta[m.id] = n + 1;
    if (n === 0) pushHito(s, `meta_${m.id}`, `Mejora adquirida: ${m.nombre}.`);
    return true;
  }

  // Mascotas: se guarda Esencia para la próxima pieza de los talleres.
  const reserve = Math.max(0, ...BUILDINGS.filter((d) => d.oficio).map((d) => BAL.CRAFT_COST * lvl(s, d.id)));
  const spare = s.currencies.esencia - reserve;
  if (s.pets.length > 0 && s.pets.length < petSlots(s) && spare >= BAL.PET_HATCH_COST * s.pets.length) {
    s.currencies.esencia -= BAL.PET_HATCH_COST * s.pets.length;
    hatch(s);
    return true;
  }
  const pet = [...s.pets].filter((p) => p.level < PET_MAX_LEVEL).sort((a, b) => a.level - b.level)[0];
  if (pet && spare >= petLevelCost(pet.level)) {
    s.currencies.esencia -= petLevelCost(pet.level);
    pet.level++;
    return true;
  }
  return false;
}
