// Generación de tramos y aparición de familias de criaturas y Umbrales.
import { BAL } from '../data/balance';
import { ERAS, UMBRAL_MENOR, zoneInfo } from '../data/eras';
import { FAMILY_BY_ID } from '../data/families';
import { familyPool, makeCreature } from './creatures';
import { creatureAtk, creatureGold, creatureHp } from './formulas';
import { pushHito } from './log';
import { nextFloat } from './rng';
import type { Creature, DayState } from './types';
import { conditionOf, hasMechanic } from './worldMods';

/** La 1.ª familia de la ruta está desde el inicio; la 2.ª aparece a los 15 min trabajados. */
export function checkUnlocks(s: DayState): void {
  s.familyIds.forEach((id, i) => {
    if (s.unlockedFamilies.includes(id)) return;
    if (i > 0 && s.workedMs < BAL.SECOND_FAMILY_MS) return;
    s.unlockedFamilies.push(id);
    if (s.workedMs > 0) pushHito(s, `familia_${id}`, `¡Algo nuevo apareció: ${FAMILY_BY_ID[id].nombre}!`);
  });
}

/** ¿El tramo tiene Umbral? La mecánica Escalada añade uno cada 5 tramos (las costillas). */
export function hasUmbral(s: DayState, zone: number): boolean {
  return zoneInfo(zone).umbral || (hasMechanic(s, 'escalada') && zone % 5 === 4);
}

/** Nombre del Umbral del tramo: el de era tiene nombre propio por corriente. */
export function bossName(s: DayState, zone: number): string {
  const info = zoneInfo(zone);
  const jefe = ERAS[info.era].jefe;
  if (info.eraEnd) return `${jefe.nombre} — ${jefe.variantes[s.corriente ?? 'N']}`;
  if (hasMechanic(s, 'escalada') && !info.umbral) return `Costilla del Gigante (tramo ${zone + 1})`;
  return info.era >= 4 ? `${jefe.nombre} (tramo ${zone + 1})` : `Umbral del tramo ${zone + 1}`;
}

export interface ZoneOptions {
  /** Nivel de las criaturas (por defecto, el tramo actual). Se usa al farmear tramos anteriores. */
  level?: number;
  /** false: sin Umbral (acampada, espera de era o farmeo). */
  boss?: boolean;
}

/**
 * Debuff progresivo del tramo actual: cada caída en él y cada minuto desde que se convirtió en
 * un muro debilitan a lo que lo guarda, para que nunca bloquee la jornada.
 */
export function wallDebuff(s: DayState): number {
  const b = s.boss;
  const minutes = b.seenAtMs > 0 ? (s.workedMs - b.seenAtMs) / 60_000 : 0;
  return Math.pow(BAL.DEATH_DEBUFF, b.deaths) * Math.max(BAL.BOSS_TIME_DEBUFF_FLOOR, 1 - BAL.BOSS_TIME_DEBUFF_PER_MIN * minutes);
}

export function generateZone(s: DayState, opts: ZoneOptions = {}): void {
  s.creatures = [];
  if (!familyPool(s).length) return;
  // Mecánica Calma (El Fondo): sin criaturas los primeros 5 min de la sub-capa.
  const sub = s.world.sub;
  if (sub && hasMechanic(s, 'calma') && s.workedMs < sub.hora * 3_600_000 + 5 * 60_000) return;

  const level = Math.max(0, opts.level ?? s.zone);
  const span = BAL.CREATURES_PER_ZONE_MAX - BAL.CREATURES_PER_ZONE_MIN + 1;
  const count = Math.max(1, BAL.CREATURES_PER_ZONE_MIN + Math.floor(nextFloat(s) * span) + s.mods.criaturasExtra);
  const slot = (BAL.CREATURE_LAST_X - BAL.CREATURE_FIRST_X) / count;
  const jitter = Math.max(0, Math.min(0.25, 1 - BAL.CREATURE_MIN_GAP / slot));
  for (let i = 0; i < count; i++) {
    s.creatures.push(makeCreature(s, level, BAL.CREATURE_FIRST_X + slot * (i + jitter * nextFloat(s))));
  }
  // Tramo que ya tumbó al héroe: sus criaturas vuelven debilitadas.
  const k = opts.level === undefined ? wallDebuff(s) : 1;
  if (k < 1) {
    for (const c of s.creatures) {
      c.maxHp *= k;
      c.hp = c.maxHp;
      c.atk *= k;
    }
  }

  // Umbral (jefe) al final del tramo.
  if (opts.boss !== false && opts.level === undefined && hasUmbral(s, s.zone)) s.creatures.push(makeBoss(s));
}

/**
 * Umbral del tramo actual. Debuff progresivo: cada caída contra él y cada minuto desde que
 * se le vio lo debilitan, para que nunca bloquee la jornada.
 */
export function makeBoss(s: DayState): Creature {
  const info = zoneInfo(s.zone);
  const fam = FAMILY_BY_ID[s.unlockedFamilies[0]];
  const k = info.eraEnd ? ERAS[info.era].jefe : info.era >= 4 && info.umbral ? ERAS[info.era].jefe : UMBRAL_MENOR;
  const debuff = wallDebuff(s);
  const hp = (creatureHp(s.zone, fam) / fam.hpMult) * k.hpMult * debuff * s.mods.criaturaVidaMult * (conditionOf(s).umbralVida ?? 1);
  return {
    familyId: fam.id,
    x: BAL.BOSS_X,
    hp,
    maxHp: hp,
    atk: (creatureAtk(s.zone, fam) / fam.atkMult) * k.atkMult * debuff * s.mods.criaturaAtkMult,
    gold: (creatureGold(s.zone, fam) / fam.goldMult) * BAL.BOSS_GOLD_MULT * s.mods.criaturaOroMult,
    atkTimerMs: fam.atkIntervalMs,
    boss: true,
    nombre: bossName(s, s.zone),
    size: 2.3,
  };
}
