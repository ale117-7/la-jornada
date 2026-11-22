// Criaturas procedurales: familia (o híbrido de dos) + 0–3 modificadores + escala por tramo.
import { BAL } from '../data/balance';
import { ENTRY_BY_ID } from '../data/origins';
import { FAMILIES, FAMILY_BY_ID, type FamilyDef } from '../data/families';
import { MODIFIER_BY_ID, MODIFIERS, type ModifierDef } from '../data/modifiers';
import { creatureAtk, creatureGold, creatureHp } from './formulas';
import { novedad, pushLog } from './log';
import { hashString, nextFloat } from './rng';
import type { Creature, DayState } from './types';
import { conditionOf, hasMechanic } from './worldMods';

/** Familias que pueden aparecer ahora mismo. */
export function familyPool(s: DayState): FamilyDef[] {
  if (hasMechanic(s, 'ensamblaje')) return FAMILIES; // mezcla de las 3 corrientes
  if (hasMechanic(s, 'dejavu') && s.build.entryId) return ENTRY_BY_ID[s.build.entryId].familias.map((id) => FAMILY_BY_ID[id]);
  return s.unlockedFamilies.map((id) => FAMILY_BY_ID[id]);
}

/** Modificadores disponibles: los normales por tramo; las Anomalías, por hora y solo en Lo Hondo. */
export function availableModifiers(s: DayState, level: number): ModifierDef[] {
  const hora = s.workedMs / 3_600_000;
  return MODIFIERS.filter((m) => (m.zonaMin !== undefined ? level >= m.zonaMin : s.era >= 4 && hora >= m.horaMin!));
}

export function creatureName(c: Pick<Creature, 'familyId' | 'hib' | 'mods'>, glitch = false): string {
  const fam = FAMILY_BY_ID[c.familyId];
  const base = c.hib ? `${fam.nucleo} ${FAMILY_BY_ID[c.hib].apellido}` : fam.nombre;
  const name = [base, ...(c.mods ?? []).map((id) => MODIFIER_BY_ID[id].adj[fam.fem ? 1 : 0])].join(' ');
  if (!glitch) return name;
  // Frontera de Ruido: nombres corruptos.
  return name.replace(/[aeiou]/g, (ch, i: number) => (i % 3 === 0 ? '▒' : ch));
}

function pickWeighted<T>(s: DayState, pool: T[], peso: (x: T) => number): T {
  let r = nextFloat(s) * pool.reduce((a, x) => a + peso(x), 0);
  for (const x of pool) {
    r -= peso(x);
    if (r < 0) return x;
  }
  return pool[pool.length - 1];
}

/** Crea una criatura del nivel dado en la posición x y la apunta en el bestiario del día. */
export function makeCreature(s: DayState, level: number, x: number): Creature {
  const m = s.mods;
  const pool = familyPool(s);
  const fam = pickWeighted(s, pool, (f) => f.peso);

  // Híbridos entre corrientes: en Lo Hondo, o desde el principio en un Día de Corrientes Cruzadas.
  let hib: FamilyDef | null = null;
  if ((s.era >= 4 || conditionOf(s).hibridos) && nextFloat(s) < 0.3) {
    const others = FAMILIES.filter((f) => f.corriente !== fam.corriente);
    hib = others[Math.floor(nextFloat(s) * others.length)];
  }

  // Modificadores: más probables y más numerosos cuanto más hondo.
  const avail = availableModifiers(s, level);
  const mods: ModifierDef[] = [];
  const p = Math.min(0.6, 0.1 + level * 0.006);
  const max = s.era >= 3 ? 3 : s.era >= 1 ? 2 : 1;
  for (let i = 0; i < max && avail.length > mods.length; i++) {
    if (nextFloat(s) >= p / (i + 1)) break;
    const rest = avail.filter((d) => !mods.includes(d));
    mods.push(pickWeighted(s, rest, (d) => d.peso ?? 1));
  }
  const forced = [hasMechanic(s, 'dejavu') ? 'ancestral' : null, s.world.sub?.anomalia ?? null];
  for (const id of forced) {
    if (id && !mods.some((d) => d.id === id) && nextFloat(s) < 0.5) mods.push(MODIFIER_BY_ID[id]);
  }

  const mul = (k: 'hp' | 'atk' | 'oro') => mods.reduce((a, d) => a * d[k], 1);
  const avg = (a: number, b: number) => (hib ? (a + b) / 2 : a);
  const hp = avg(creatureHp(level, fam), hib ? creatureHp(level, hib) : 0) * mul('hp') * m.criaturaVidaMult;
  const c: Creature = {
    familyId: fam.id,
    x,
    hp,
    maxHp: hp,
    atk: avg(creatureAtk(level, fam), hib ? creatureAtk(level, hib) : 0) * mul('atk') * m.criaturaAtkMult,
    gold: avg(creatureGold(level, fam), hib ? creatureGold(level, hib) : 0) * mul('oro') * m.criaturaOroMult,
    atkTimerMs: fam.atkIntervalMs,
  };
  if (hib) c.hib = hib.id;
  if (mods.length) {
    c.mods = mods.map((d) => d.id);
    const iv = mods.reduce((a, d) => a * (d.intervalo ?? 1), 1);
    if (iv !== 1) c.iv = iv;
    if (mods.some((d) => d.explota)) c.explota = true;
    if (mods.some((d) => d.divide)) c.divide = true;
    if (mods.some((d) => d.grande)) c.size = 1.5;
  }
  c.nombre = creatureName(c, hasMechanic(s, 'glitch'));
  register(s, c);
  return c;
}

/** Bestiario del día: cada combinación nueva cuenta como novedad. */
function register(s: DayState, c: Creature): void {
  const w = s.world;
  const key = hashString(`${c.familyId}|${c.hib ?? ''}|${[...(c.mods ?? [])].sort().join(',')}`);
  if (w.bestiario.includes(key)) return;
  if (w.bestiario.length < BAL.BESTIARIO_MAX) w.bestiario.push(key);
  novedad(s, true);
  for (const id of c.mods ?? []) {
    if (w.modsVistos.includes(id)) continue;
    w.modsVistos.push(id);
    w.modsVistosT.push(Math.round(s.workedMs));
    const d = MODIFIER_BY_ID[id];
    novedad(s, true);
    pushLog(s, `¡Algo nuevo apareció: criaturas «${d.adj[0]}»${d.horaMin !== undefined ? ' (Anomalía)' : ''}! Primera: ${c.nombre}.`);
  }
}
