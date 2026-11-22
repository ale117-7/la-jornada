import { BAL } from '../data/balance';
import { eraScale } from '../data/eras';
import type { FamilyDef } from '../data/families';
import { UPGRADES, type StatId, type UpgradeDef } from '../data/upgrades';
import { BASE_MODS, GOLPE_FUERTE_CADA, type Mods } from './mods';

export type HeroStats = Record<StatId, number>;

/** Estadísticas del héroe: base + mejoras compradas + modificadores de la build. */
export function heroStats(levels: Record<string, number>, mods: Mods = BASE_MODS): HeroStats {
  const s: HeroStats = { ...BAL.HERO_BASE };
  for (const u of UPGRADES) {
    const n = levels[u.id] ?? 0;
    if (n === 0) continue;
    s[u.stat] = u.mode === 'mult' ? s[u.stat] * Math.pow(u.perLevel, n) : s[u.stat] + u.perLevel * n;
    if (u.maxValue !== undefined) s[u.stat] = Math.min(s[u.stat], u.maxValue);
  }
  s.vida *= mods.vidaMult;
  s.ataque *= mods.ataqueMult;
  s.velocidadAtaque *= mods.velAtaqueMult;
  s.regeneracion *= mods.regenMult;
  s.alcance *= mods.alcanceMult;
  s.velocidad *= mods.velocidadMult;
  s.critico = Math.min(1, s.critico + mods.criticoAdd);
  s.danoCritico += mods.danoCriticoAdd;
  s.defensa += mods.defensaAdd;
  return s;
}

/** Daño por segundo total: golpes (con golpe fuerte) + veneno. */
export function totalDps(s: HeroStats, mods: Mods): number {
  return expectedHit(s) * (1 + mods.golpeFuerte / GOLPE_FUERTE_CADA) * s.velocidadAtaque + s.ataque * mods.veneno;
}

export function upgradeCost(u: UpgradeDef, level: number): number {
  return u.baseCost * Math.pow(BAL.UPGRADE_COST_GROWTH, level);
}

export function creatureHp(zone: number, f: FamilyDef): number {
  return BAL.CREATURE_HP_BASE * Math.pow(BAL.CREATURE_HP_GROWTH, zone) * eraScale(zone).hp * f.hpMult;
}
export function creatureAtk(zone: number, f: FamilyDef): number {
  return BAL.CREATURE_ATK_BASE * Math.pow(BAL.CREATURE_ATK_GROWTH, zone) * eraScale(zone).atk * f.atkMult;
}
/** Moneda que suelta una criatura normal (sin familia ni modificadores) del tramo. */
export function zoneGold(zone: number): number {
  return BAL.CREATURE_GOLD_BASE * Math.pow(BAL.CREATURE_GOLD_GROWTH, zone) * eraScale(zone).oro;
}
export function creatureGold(zone: number, f: FamilyDef): number {
  return zoneGold(zone) * f.goldMult;
}

/** Daño medio por golpe del héroe (incluye críticos). */
export function expectedHit(s: HeroStats): number {
  return s.ataque * (1 + s.critico * (s.danoCritico - 1));
}
export function heroDps(s: HeroStats): number {
  return expectedHit(s) * s.velocidadAtaque;
}
/** Fracción del daño que atraviesa la defensa. */
export function mitigation(defensa: number): number {
  return 100 / (100 + defensa);
}
/** Puntaje de poder que usa la IA de compras para estimar el valor de una mejora. */
export function power(s: HeroStats): number {
  const aguante = (s.vida / mitigation(s.defensa)) * (1 + s.regeneracion * 30);
  return heroDps(s) * Math.pow(aguante, 0.7);
}
