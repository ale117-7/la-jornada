// La build del día: chasis, punto de entrada, compañeros y rumbo. De ella salen las
// etiquetas, las sinergias activas y los modificadores que lee la simulación.
import { COMBO_MIN_ELEMENTOS, COMBOS } from '../data/combos';
import { COMPANION_BY_ID } from '../data/companions';
import { DESTINY_BY_ID } from '../data/destiny';
import { CHASSIS_BY_ID, ENTRY_BY_ID } from '../data/origins';
import { PACT_BY_ID } from '../data/pacts';
import { REGION_BY_ID } from '../data/regions';
import { RELIC_BY_ID } from '../data/relics';
import { SYNERGIES, type SynergyDef, type SynergyLevel, type Tag } from '../data/tags';
import { baseEfectos } from './base';
import { novedad, pushHito, pushLog } from './log';
import { combineEfectos, describeEfectos, type Efectos } from './mods';
import type { DayState } from './types';
import { PRESION_MAX_EFECTO, presionBase, worldEfectos } from './worldMods';

export interface BuildElement {
  tipo: 'Chasis' | 'Origen' | 'Compañero' | 'Rumbo' | 'Pacto' | 'Artefacto' | 'Destino';
  nombre: string;
  etiquetas: Tag[];
  efectos: Efectos;
  /** Texto secundario (habilidad, misión…). */
  detalle: string;
  /** Id del compañero (para su retrato en el panel). */
  id?: string;
}

const MISION_TXT = { bajas: 'bajas', tramos: 'tramos', moneda: 'de moneda', minutos: 'min trabajados' } as const;

export function missionProgress(s: DayState, c: DayState['build']['companions'][number]): { actual: number; meta: number } {
  const m = COMPANION_BY_ID[c.id].mision;
  const actual =
    m.tipo === 'bajas' ? s.kills - c.base.kills
    : m.tipo === 'tramos' ? s.zone - c.base.zone
    : m.tipo === 'moneda' ? s.totalGold - c.base.totalGold
    : (s.workedMs - c.base.workedMs) / 60_000;
  return { actual: Math.min(m.cantidad, Math.floor(actual)), meta: m.cantidad };
}

/** Elementos de la build que cuentan para las sinergias. */
export function buildElements(s: DayState): BuildElement[] {
  const b = s.build;
  const out: BuildElement[] = [];
  const ch = b.chassisId ? CHASSIS_BY_ID[b.chassisId] : null;
  if (ch) out.push({ tipo: 'Chasis', nombre: ch.nombre, etiquetas: ch.etiquetas, efectos: ch.efectos, detalle: ch.habilidad });
  const en = b.entryId ? ENTRY_BY_ID[b.entryId] : null;
  if (en) out.push({ tipo: 'Origen', nombre: en.nombre, etiquetas: en.etiquetas, efectos: en.efectos, detalle: describeEfectos(en.efectos).join(' · ') });
  for (const c of b.companions) {
    const def = COMPANION_BY_ID[c.id];
    const p = missionProgress(s, c);
    out.push({
      tipo: 'Compañero',
      id: c.id,
      nombre: c.evolved ? def.evolucion.nombre : def.nombre,
      etiquetas: def.etiquetas,
      efectos: c.evolved ? def.evolucion.efectos : def.efectos,
      detalle: c.evolved ? `${def.rol} · evolucionado` : `${def.rol} · misión: ${p.actual}/${p.meta} ${MISION_TXT[def.mision.tipo]}`,
    });
  }
  const re = b.regionId ? REGION_BY_ID[b.regionId] : null;
  if (re) out.push({ tipo: 'Rumbo', nombre: re.nombre, etiquetas: re.etiquetas, efectos: re.efectos, detalle: describeEfectos(re.efectos).join(' · ') });
  const pa = b.pactId ? PACT_BY_ID[b.pactId] : null;
  if (pa) {
    out.push({
      tipo: 'Pacto',
      nombre: pa.nombre,
      etiquetas: pa.etiquetas,
      efectos: { ...pa.beneficio, ...pa.coste },
      detalle: `${describeEfectos(pa.beneficio).join(' · ')} — coste: ${describeEfectos(pa.coste).join(' · ')}`,
    });
  }
  for (const id of b.destinos) {
    const d = DESTINY_BY_ID[id];
    // Sus efectos entran por el mundo (worldEfectos); aquí cuenta para las etiquetas.
    out.push({ tipo: 'Destino', nombre: d.nombre, etiquetas: d.etiquetas, efectos: {}, detalle: d.efectos ? describeEfectos(d.efectos).join(' · ') : d.texto });
  }
  for (const id of b.relics) {
    const r = RELIC_BY_ID[id];
    out.push({ tipo: 'Artefacto', nombre: r.nombre, etiquetas: [r.etiqueta], efectos: r.efectos, detalle: `${r.grado} · ${describeEfectos(r.efectos).join(' · ')}` });
  }
  return out;
}

export function buildTags(s: DayState): Set<Tag> {
  return new Set(buildElements(s).flatMap((e) => e.etiquetas));
}

export interface SynergyStatus {
  def: SynergyDef;
  count: number;
  /** Niveles ya activos. */
  activos: SynergyLevel[];
  /** Siguiente nivel por alcanzar (null si ya está al máximo). */
  siguiente: SynergyLevel | null;
}

/** Estado de cada etiqueta presente en la build, para el panel de sinergias. */
export function synergyStatus(s: DayState): SynergyStatus[] {
  return SYNERGIES.filter((d) => (s.synergies[d.tag] ?? 0) > 0)
    .map((def) => {
      const count = s.synergies[def.tag];
      return {
        def,
        count,
        activos: def.niveles.filter((l) => count >= l.n),
        siguiente: def.niveles.find((l) => count < l.n) ?? null,
      };
    })
    .sort((a, b) => b.count - a.count);
}

/** Recalcula etiquetas, sinergias y modificadores. Anuncia en el registro las sinergias nuevas. */
export function recomputeBuild(s: DayState): void {
  const elements = buildElements(s);
  const counts: Record<string, number> = {};
  for (const e of elements) for (const t of new Set(e.etiquetas)) counts[t] = (counts[t] ?? 0) + 1;

  const efectos: Efectos[] = [...elements.map((e) => e.efectos), ...s.build.extras.map((x) => x.efectos), ...baseEfectos(s), ...worldEfectos(s)];
  for (const def of SYNERGIES) {
    const now = counts[def.tag] ?? 0;
    const before = s.synergies[def.tag] ?? 0;
    for (const lvl of def.niveles) {
      if (now < lvl.n) continue;
      efectos.push(lvl.efectos);
      if (before < lvl.n) {
        novedad(s);
        pushLog(s, `Sinergia activada: ${def.tag} ×${lvl.n} — ${lvl.nombre}: ${describeEfectos(lvl.efectos).join(', ')}.`);
      }
    }
  }
  s.synergies = counts;

  // Combos secretos: dos etiquetas concretas presentes a la vez. Se descubren sin avisar.
  const w = s.world;
  for (const c of COMBOS) {
    if (w.combos.includes(c.id)) continue;
    const a = counts[c.tags[0]] ?? 0;
    const b = counts[c.tags[1]] ?? 0;
    if (a === 0 || b === 0 || a + b < COMBO_MIN_ELEMENTOS) continue;
    w.combos.push(c.id);
    efectos.push(c.efectos);
    pushHito(s, `combo_${c.id}`, `COMBO SECRETO descubierto: ${c.tags[0]} + ${c.tags[1]} = «${c.nombre}» (${describeEfectos(c.efectos).join(', ')})${s.knownCombos.includes(c.id) ? '' : ' — nuevo en la Crónica'}.`);
  }

  // Presión: sube con la profundidad y resta ataque y vida (o da daño, con el Pacto de la Hondura).
  const m = combineEfectos(efectos);
  const p = Math.max(0, presionBase(s) * m.presionMult + m.presionAdd);
  w.presion = p;
  const f = Math.min(1, p / 100) * PRESION_MAX_EFECTO;
  if (m.presionInvertida > 0) m.ataqueMult *= 1 + f * 2;
  else {
    m.ataqueMult *= 1 - f;
    m.vidaMult *= 1 - f;
  }
  s.mods = m;
}

/** Comprueba las misiones personales de los compañeros; al cumplirse, evolucionan. */
export function checkMissions(s: DayState): void {
  for (const c of s.build.companions) {
    if (c.evolved) continue;
    const p = missionProgress(s, c);
    if (p.actual < p.meta) continue;
    c.evolved = true;
    const def = COMPANION_BY_ID[c.id];
    pushLog(s, `${def.nombre} cumplió su misión y evoluciona: ${def.evolucion.nombre}.`);
    recomputeBuild(s);
  }
}
