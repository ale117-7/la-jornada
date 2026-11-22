// Elige el arte de cada cosa a partir del estado del día (sin estado propio).
import type { Creature, DayState } from '../../core/types';
import { zoneInfo } from '../../data/eras';
import { FAMILY_BY_ID } from '../../data/families';
import { CICLO_UMBRALES } from '../../data/route';
import type { Corriente } from '../../data/tags';
import {
  CHASSIS_ART,
  CICLO_ART,
  COSTILLA_ART,
  ELITE_ART,
  ERA_BOSS_ART,
  ERA_SCENERY,
  FAMILY_ART,
  FAMILY_HIB,
  HERO,
  SCENERY_CICLO,
  SCENERY_HONDO,
  SCENERY_START,
  SUB_SCENERY,
  UMBRAL_MENOR_ART,
} from './catalog';
import type { ArtDef, Ref } from './sprites';

export function heroArt(s: DayState): ArtDef {
  const ch = s.build.chassisId ? CHASSIS_ART[s.build.chassisId] : undefined;
  return ch ?? HERO[s.corriente ?? 'N'];
}

export interface CreatureArt {
  def: ArtDef;
  /** Cuadro de la variante de paleta del híbrido (si la hoja la trae). */
  hib?: Ref;
  /** Color para teñir al híbrido cuando no hay variante dibujada. */
  hibTint?: string;
  /** La Costilla del Gigante (se dibuja según la vida que le queda). */
  costilla?: boolean;
}

/** Arte de una criatura: Umbral de era, Umbral menor, élite con nombre o su familia. */
export function creatureArt(s: DayState, c: Creature, hibColor?: string): CreatureArt | null {
  const fam = FAMILY_BY_ID[c.familyId];
  const corr: Corriente = s.corriente ?? fam.corriente;
  const nombre = c.nombre ?? '';
  if (c.boss) {
    if (nombre.startsWith('Costilla del Gigante')) return { def: COSTILLA_ART, costilla: true };
    const info = zoneInfo(s.zone);
    if (nombre.includes(' — ') || info.era >= 4) return { def: ERA_BOSS_ART[Math.min(4, info.era)][corr] };
    return { def: UMBRAL_MENOR_ART[fam.corriente] };
  }
  if (c.elite) {
    const own = ELITE_ART[nombre];
    if (own) return { def: own };
    const ci = CICLO_UMBRALES.findIndex((n) => nombre.startsWith(n));
    if (ci >= 0) return { def: CICLO_ART[ci] };
    if (nombre.startsWith('El Rival')) return { def: ELITE_ART['El Rival'] };
  }
  const def = FAMILY_ART[c.familyId];
  if (!def) return null;
  if (c.hib) {
    const hc = FAMILY_BY_ID[c.hib].corriente;
    const v = FAMILY_HIB[c.familyId]?.[hc];
    return v ? { def, hib: v } : { def, hibTint: hibColor };
  }
  return { def };
}

/** Hoja de escenario del momento. */
export function sceneryFor(s: DayState): string {
  if (s.era >= 4) {
    const sub = s.world.sub;
    if (!sub) return SCENERY_HONDO;
    if (sub.ciclo > 0) return SCENERY_CICLO;
    return SUB_SCENERY[sub.nombre] ?? SCENERY_HONDO;
  }
  if (!s.corriente) return SCENERY_START;
  return ERA_SCENERY[s.era]?.[s.corriente] ?? SCENERY_START;
}
