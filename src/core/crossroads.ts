// Encrucijadas: calendario por semilla, generación de las cartas, elección y auto-elección.
import { COMPANION_BY_ID, COMPANIONS } from '../data/companions';
import {
  CARDS_PER_CROSSROADS,
  CROSSROADS_NAMES,
  CROSSROADS_SCHEDULE,
  DESTINO_CADA_MIN,
  RELIC_CARD_PROB,
  WEIGHT_NEW,
  WEIGHT_SHARED_TAG,
  type CrossroadsType,
} from '../data/crossroads';
import { DESTINIES, DESTINY_BY_ID } from '../data/destiny';
import { FAMILY_BY_ID } from '../data/families';
import { CHASSIS, CHASSIS_BY_ID, ENTRY_BY_ID, ENTRY_POINTS, type Oculto } from '../data/origins';
import { PACT_BY_ID, PACTS } from '../data/pacts';
import { REGION_BY_ID, REGIONS } from '../data/regions';
import { RELIC_BY_ID, RELICS } from '../data/relics';
import { CICLOS_DESDE_HORA } from '../data/route';
import { CORRIENTES, RAREZA_PESO, RAREZA_PESO_EXTRA, type Corriente, type Rareza, type Tag } from '../data/tags';
import { buildTags, recomputeBuild } from './build';
import { heroStats } from './formulas';
import { novedad, pushLog } from './log';
import { describeEfectos, scaleEfectos } from './mods';
import { hashString, nextFloat, type RngHolder } from './rng';
import type { DayState, OfferedCard, ScheduledCrossroads } from './types';
import { applyEfx, startChains } from './world';
import { conditionOf } from './worldMods';
import { checkUnlocks, generateZone } from './zone';

const MISION_TXT = { bajas: 'bajas', tramos: 'tramos', moneda: 'de moneda', minutos: 'min trabajados' } as const;
const MIN = 60_000;

/** RNG propio de cada Encrucijada: las cartas dependen de la semilla, no del camino de la simulación. */
function rngFor(s: DayState, label: string, index: number): RngHolder {
  return { rngState: hashString(`${s.seed}:${label}:${index}`) };
}

export function createSchedule(seed: number): ScheduledCrossroads[] {
  const r: RngHolder = { rngState: hashString(`${seed}:calendario`) };
  return CROSSROADS_SCHEDULE.map((slot) => {
    const [a, b] = slot.ventanaMin;
    return { tipo: slot.tipo, atMs: Math.round((a + nextFloat(r) * (b - a)) * MIN), done: false };
  });
}

// ---------- cartas ----------

export type CardKind = 'origen' | 'companero' | 'rumbo' | 'pacto' | 'destino' | 'reliquia';

export interface CardView {
  id: string;
  tipo: CardKind;
  nombre: string;
  subtitulo: string;
  corriente: Corriente | '?';
  rareza: Rareza;
  texto: string;
  /** Efectos visibles. */
  lineas: string[];
  etiquetas: Tag[];
  /** Etiquetas que ya están en la build (ayudan a planear sinergias). */
  compartidas: Tag[];
  oculto: boolean;
  nuevo: boolean;
}

const kindOf = (id: string): CardKind =>
  id.startsWith('origen:') ? 'origen'
  : id.startsWith('comp:') ? 'companero'
  : id.startsWith('pacto:') ? 'pacto'
  : id.startsWith('destino:') ? 'destino'
  : id.startsWith('reliquia:') ? 'reliquia'
  : 'rumbo';
const idOf = (id: string) => id.slice(id.indexOf(':') + 1);

function parseOrigin(id: string): [string, string] {
  const [entry, chassis] = idOf(id).split('+');
  return [entry, chassis];
}

function isNew(s: DayState, cardId: string): boolean {
  if (cardId.startsWith('origen:')) {
    const prefix = `origen:${parseOrigin(cardId)[0]}+`;
    return !s.seenCards.some((c) => c.startsWith(prefix));
  }
  return !s.seenCards.includes(cardId);
}

function hiddenOf(cardId: string): Oculto | undefined {
  if (cardId.startsWith('origen:')) return ENTRY_BY_ID[parseOrigin(cardId)[0]].oculto;
  if (cardId.startsWith('comp:')) return COMPANION_BY_ID[idOf(cardId)].oculto;
  return undefined;
}

export function cardView(s: DayState, card: OfferedCard): CardView {
  const mine = buildTags(s);
  const base = { id: card.id, oculto: card.oculto, nuevo: card.nuevo };
  const shared = (tags: Tag[]) => tags.filter((t) => mine.has(t));
  const kind = kindOf(card.id);
  let v: CardView;

  if (kind === 'origen') {
    const [e, c] = parseOrigin(card.id);
    const entry = ENTRY_BY_ID[e];
    const ch = CHASSIS_BY_ID[c];
    const etiquetas = [...new Set([...entry.etiquetas, ...ch.etiquetas])];
    v = {
      ...base, tipo: kind, nombre: entry.nombre,
      subtitulo: `${ch.nombre} · Corriente ${CORRIENTES[entry.corriente].nombre}`,
      corriente: entry.corriente, rareza: entry.rareza, texto: entry.texto,
      lineas: [
        `Criaturas: ${entry.familias.map((f) => FAMILY_BY_ID[f].nombre).join(' y ')}`,
        `${ch.nombre}: ${ch.habilidad}`,
        ...describeEfectos(ch.efectos),
        ...describeEfectos(entry.efectos),
      ],
      etiquetas, compartidas: shared(etiquetas),
    };
  } else if (kind === 'companero') {
    const d = COMPANION_BY_ID[idOf(card.id)];
    v = {
      ...base, tipo: kind, nombre: d.nombre, subtitulo: d.rol, corriente: '?', rareza: d.rareza, texto: d.texto,
      lineas: [...describeEfectos(d.efectos), `Misión: ${d.mision.cantidad} ${MISION_TXT[d.mision.tipo]} → ${d.evolucion.nombre}`],
      etiquetas: d.etiquetas, compartidas: shared(d.etiquetas),
    };
  } else if (kind === 'pacto') {
    const d = PACT_BY_ID[idOf(card.id)];
    v = {
      ...base, tipo: kind, nombre: d.nombre, subtitulo: `Pacto · ${d.clase}`, corriente: '?', rareza: d.rareza, texto: d.texto,
      lineas: [...describeEfectos(d.beneficio), ...describeEfectos(d.coste).map((l) => `Coste: ${l}`)],
      etiquetas: d.etiquetas, compartidas: shared(d.etiquetas),
    };
  } else if (kind === 'destino') {
    const d = DESTINY_BY_ID[idOf(card.id)];
    v = {
      ...base, tipo: kind, nombre: d.nombre, subtitulo: `Destino · ${d.clase}`, corriente: '?', rareza: d.rareza, texto: d.texto,
      lineas: [...(d.efectos ? describeEfectos(d.efectos) : []), ...(d.efx ? ['Ocurre algo en cuanto la eliges'] : []), ...(d.espejo ? ['El mundo se da la vuelta'] : [])],
      etiquetas: d.etiquetas, compartidas: shared(d.etiquetas),
    };
  } else if (kind === 'reliquia') {
    const d = RELIC_BY_ID[idOf(card.id)];
    v = {
      ...base, tipo: kind, nombre: d.nombre, subtitulo: `Artefacto · ${CORRIENTES[d.corriente].nombre}`, corriente: d.corriente, rareza: d.grado, texto: d.texto,
      lineas: describeEfectos(d.efectos), etiquetas: [d.etiqueta], compartidas: shared([d.etiqueta]),
    };
  } else {
    const r = REGION_BY_ID[idOf(card.id)];
    // "Sin mapa" (la carta, o todas en un Día Sin Mapa): no se sabe adónde lleva.
    const unknown = r.corriente === '?' || (conditionOf(s).sinMapa && !card.revelado);
    v = {
      ...base, tipo: kind,
      nombre: unknown && r.corriente !== '?' ? 'Ruta sin mapa' : r.nombre,
      subtitulo: unknown ? 'Corriente ???' : `Corriente ${CORRIENTES[r.corriente as Corriente].nombre}`,
      corriente: unknown ? '?' : r.corriente, rareza: r.rareza,
      texto: unknown && r.corriente !== '?' ? 'Hoy nadie tiene mapas. Solo queda saltar.' : r.texto,
      lineas: unknown ? [] : [`Criaturas: ${r.familias.map((f) => FAMILY_BY_ID[f].nombre).join(' y ')}`, ...describeEfectos(r.efectos)],
      etiquetas: unknown ? [] : r.etiquetas, compartidas: unknown ? [] : shared(r.etiquetas),
    };
  }
  // Un suceso reveló lo que esconde la línea "???".
  const hidden = card.oculto && card.revelado ? hiddenOf(card.id) : undefined;
  if (hidden) v.lineas.push(`??? revelado: ${describeEfectos(hidden.efectos).join(', ')}`);
  return v;
}

// ---------- generación (6.4) ----------

function weighted<T>(rng: RngHolder, pool: T[], weight: (c: T) => number): T {
  const total = pool.reduce((a, c) => a + weight(c), 0);
  let r = nextFloat(rng) * total;
  for (const c of pool) {
    r -= weight(c);
    if (r < 0) return c;
  }
  return pool[pool.length - 1];
}

/** Elige `count` sin repetir subtipo; garantiza al menos 1 "nueva en la Crónica" si existe. */
function pickCards<T>(rng: RngHolder, count: number, cands: T[], weight: (c: T) => number, subtipo: (c: T) => string, nuevo: (c: T) => boolean): T[] {
  const picked: T[] = [];
  const free = (c: T, others: T[]) => !others.some((p) => subtipo(p) === subtipo(c));
  while (picked.length < count && picked.length < cands.length) {
    const rest = cands.filter((c) => !picked.includes(c));
    const distinct = rest.filter((c) => free(c, picked));
    picked.push(weighted(rng, distinct.length ? distinct : rest, weight));
  }
  if (picked.length && !picked.some(nuevo)) {
    const others = picked.slice(0, -1);
    const fresh = cands.filter((c) => nuevo(c) && !picked.includes(c));
    const distinct = fresh.filter((c) => free(c, others));
    const pool = distinct.length ? distinct : fresh;
    if (pool.length) picked[picked.length - 1] = weighted(rng, pool, weight);
  }
  return picked;
}

function generateOffer(s: DayState, index: number, tipo: CrossroadsType): OfferedCard[] {
  const rng = rngFor(s, 'cartas', index);
  const mine = buildTags(s);
  const flags = s.world.flags;
  // Rarezas: 60/28/10/2 %; en Horas Extra (Lo Hondo), 35/35/22/8 %.
  const pesos = s.era >= 4 ? RAREZA_PESO_EXTRA : RAREZA_PESO;
  const w = (rareza: Rareza, tags: Tag[], id: string) =>
    pesos[rareza] * (tags.some((t) => mine.has(t)) ? WEIGHT_SHARED_TAG : 1) * (isNew(s, id) ? WEIGHT_NEW : 1);
  // Día Generoso y Mapa Mojado añaden una carta.
  let count = conditionOf(s).cartas ?? CARDS_PER_CROSSROADS;
  if (flags.cuatroCartas && tipo !== 'origen') {
    count++;
    flags.cuatroCartas = false;
  }

  let ids: string[];
  if (tipo === 'origen') {
    // Corrientes distintas; cada punto de entrada se combina con un chasis.
    const entries = pickCards(rng, count, ENTRY_POINTS, (e) => w(e.rareza, e.etiquetas, `origen:${e.id}+`), (e) => e.corriente, (e) => isNew(s, `origen:${e.id}+`));
    const used: string[] = [];
    ids = entries.map((e) => {
      const ch = weighted(rng, CHASSIS.filter((c) => !used.includes(c.id)), (c) => (c.corriente === e.corriente ? 2 : 1));
      used.push(ch.id);
      return `origen:${e.id}+${ch.id}`;
    });
  } else if (tipo === 'companero') {
    const have = s.build.companions.map((c) => c.id);
    ids = pickCards(rng, count, COMPANIONS.filter((c) => !have.includes(c.id)), (c) => w(c.rareza, c.etiquetas, `comp:${c.id}`), (c) => c.rol, (c) => isNew(s, `comp:${c.id}`)).map((c) => `comp:${c.id}`);
  } else if (tipo === 'pacto') {
    ids = pickCards(rng, count, PACTS.filter((p) => p.id !== s.build.pactId), (p) => w(p.rareza, p.etiquetas, `pacto:${p.id}`), (p) => p.clase, (p) => isNew(s, `pacto:${p.id}`)).map((p) => `pacto:${p.id}`);
  } else if (tipo === 'destino') {
    ids = pickCards(rng, count, DESTINIES.filter((d) => !s.build.destinos.includes(d.id)), (d) => w(d.rareza, d.etiquetas, `destino:${d.id}`), (d) => d.clase, (d) => isNew(s, `destino:${d.id}`)).map((d) => `destino:${d.id}`);
  } else {
    ids = pickCards(rng, count, REGIONS.filter((r) => r.id !== s.build.regionId), (r) => w(r.rareza, r.etiquetas, `rumbo:${r.id}`), (r) => r.corriente, (r) => isNew(s, `rumbo:${r.id}`)).map((r) => `rumbo:${r.id}`);
  }

  // Artefactos mezclados en cualquier Encrucijada desde la Era II (y para completar si faltan cartas).
  if (tipo !== 'origen' && s.era >= 1) {
    const free = RELICS.filter((r) => !s.build.relics.includes(r.id));
    const relic = () => {
      const pool = free.filter((r) => !ids.includes(`reliquia:${r.id}`));
      return pool.length ? `reliquia:${weighted(rng, pool, (r) => w(r.grado, [r.etiqueta], `reliquia:${r.id}`)).id}` : null;
    };
    if (ids.length >= count && nextFloat(rng) < RELIC_CARD_PROB) {
      const id = relic();
      if (id) ids[ids.length - 1] = id;
    }
    while (ids.length < count) {
      const id = relic();
      if (!id) break;
      ids.push(id);
    }
  }

  // Como máximo 1 carta lleva la línea "???" (en un Día Sin Mapa, todas las rutas van a ciegas).
  let hiddenUsed = false;
  const revelado = flags.revelaOculto;
  const cards = ids.map((id) => {
    const has = id === 'rumbo:sin_mapa' || hiddenOf(id) !== undefined;
    const oculto = has && !hiddenUsed;
    if (oculto) hiddenUsed = true;
    return { id, oculto, nuevo: isNew(s, id), ...(revelado && oculto ? { revelado: true } : {}) };
  });
  if (revelado && hiddenUsed) flags.revelaOculto = false;
  return cards;
}

// ---------- ciclo de vida ----------

export const originPending = (s: DayState) => s.pendingCrossroads?.tipo === 'origen';

/** Abre la Encrucijada que toque y, si lleva demasiado esperando, deja que el Destino elija. */
export function checkCrossroads(s: DayState): void {
  const p = s.pendingCrossroads;
  if (p) {
    if (p.tipo !== 'origen' && s.autoChooseMs > 0 && s.workedMs - p.sinceMs >= s.autoChooseMs) {
      const r = rngFor(s, 'destino', p.index);
      applyChoice(s, Math.floor(nextFloat(r) * p.cards.length), true);
    }
    return;
  }
  // Lo Hondo: una Encrucijada cada 60–90 min, sin fin (cada 60 en los Ciclos Invertidos).
  if (s.era >= 4 && !s.scheduledCrossroads.some((c) => !c.done)) {
    const n = s.scheduledCrossroads.length;
    const r = rngFor(s, 'calendario', n);
    const [a, b] = DESTINO_CADA_MIN;
    const gap = s.workedMs >= CICLOS_DESDE_HORA * 3_600_000 ? a : a + nextFloat(r) * (b - a);
    s.scheduledCrossroads.push({ tipo: 'destino', atMs: Math.round(s.workedMs + gap * MIN), done: false });
  }
  const index = s.scheduledCrossroads.findIndex((c) => !c.done && s.workedMs >= c.atMs);
  if (index < 0) return;
  const tipo = s.scheduledCrossroads[index].tipo;
  const cards = generateOffer(s, index, tipo);
  if (!cards.length) {
    s.scheduledCrossroads[index].done = true;
    return;
  }
  s.pendingCrossroads = { index, tipo, sinceMs: s.workedMs, cards };
  s.world.flags.anuncioTemprano = false;
  if (tipo !== 'origen') {
    novedad(s);
    pushLog(s, `⚠ Encrucijada de ${CROSSROADS_NAMES[tipo]}: la expedición acampa hasta que elijas.`);
  }
}

/** Tiempo trabajado hasta el próximo suceso de Encrucijada (apertura o auto-elección). */
export function msToNextCrossroadsEvent(s: DayState): number {
  const p = s.pendingCrossroads;
  if (p) return p.tipo !== 'origen' && s.autoChooseMs > 0 ? Math.max(0, p.sinceMs + s.autoChooseMs - s.workedMs) : Infinity;
  const next = s.scheduledCrossroads.filter((c) => !c.done).map((c) => c.atMs);
  return next.length ? Math.max(0, Math.min(...next) - s.workedMs) : Infinity;
}

/** ms hasta la próxima Encrucijada programada, o null si no queda ninguna. */
export function msToNextScheduled(s: DayState): number | null {
  const next = s.scheduledCrossroads.filter((c) => !c.done).map((c) => c.atMs);
  return next.length ? Math.max(0, Math.min(...next) - s.workedMs) : null;
}

export function applyChoice(s: DayState, cardIndex: number, auto = false): void {
  const p = s.pendingCrossroads;
  const card = p?.cards[cardIndex];
  if (!p || !card) return;
  const view = cardView(s, { ...card, revelado: true });
  const b = s.build;
  const kind = kindOf(card.id);
  const id = idOf(card.id);

  if (kind === 'origen') {
    const [e, c] = parseOrigin(card.id);
    const entry = ENTRY_BY_ID[e];
    b.entryId = e;
    b.chassisId = c;
    s.hero.spriteKey = CHASSIS_BY_ID[c].spriteKey;
    s.corriente = entry.corriente;
    s.familyIds = [...entry.familias];
    s.unlockedFamilies = [];
    startChains(s);
  } else if (kind === 'companero') {
    b.companions.push({ id, evolved: false, base: { kills: s.kills, zone: s.zone, totalGold: s.totalGold, workedMs: s.workedMs } });
    // Día de los Gemelos: llega con una copia débil de sí mismo.
    const gemelo = conditionOf(s).gemelos;
    if (gemelo) {
      const d = COMPANION_BY_ID[id];
      b.extras.push({ cardId: card.id, texto: `Gemelo de ${d.nombre}: una copia débil lo acompaña.`, efectos: scaleEfectos(d.efectos, gemelo) });
    }
  } else if (kind === 'pacto') {
    b.pactId = id;
  } else if (kind === 'destino') {
    const d = DESTINY_BY_ID[id];
    b.destinos.push(id);
    if (d.espejo) s.world.flags.espejo = true;
    if (d.efx) applyEfx(s, d.efx, d.nombre);
  } else if (kind === 'reliquia') {
    b.relics.push(id);
  } else {
    let region = REGION_BY_ID[id];
    if (region.corriente === '?') {
      // Sin mapa: se revela una ruta al azar y se conserva el extra de la carta.
      const r = rngFor(s, 'sinmapa', p.index);
      const real = weighted(r, REGIONS.filter((x) => x.corriente !== '?' && x.id !== b.regionId), () => 1);
      b.extras.push({ cardId: card.id, texto: `Sin mapa: la caída terminó en «${real.nombre}».`, efectos: region.efectos });
      pushLog(s, `??? revelado — la caída terminó en «${real.nombre}» (${CORRIENTES[real.corriente as Corriente].nombre}). ${describeEfectos(region.efectos).join(', ')}.`);
      region = real;
    }
    b.regionId = region.id;
    s.corriente = region.corriente as Corriente;
    s.familyIds = [...region.familias];
    s.unlockedFamilies = [];
  }

  const hidden = card.oculto ? hiddenOf(card.id) : undefined;
  if (hidden) {
    b.extras.push({ cardId: card.id, texto: hidden.texto, efectos: hidden.efectos });
    pushLog(s, `??? revelado — ${hidden.texto} ${describeEfectos(hidden.efectos).join(', ')}.`);
  }

  s.chosenCards.push(card.id);
  s.scheduledCrossroads[p.index].done = true;
  s.pendingCrossroads = null;
  novedad(s);
  pushLog(
    s,
    auto
      ? `El Destino eligió por ti (${CROSSROADS_NAMES[p.tipo]}): ${view.nombre}.`
      : `Encrucijada de ${CROSSROADS_NAMES[p.tipo]}: elegiste ${view.nombre}${kind === 'origen' ? ` · ${view.subtitulo}` : ''}.`,
  );
  recomputeBuild(s);
  checkUnlocks(s);
  if (kind === 'origen') {
    generateZone(s);
    s.hero.hp = heroStats(s.upgrades, s.mods).vida;
  }
}

/** Debug: adelanta la próxima Encrucijada (o crea una nueva si no quedan). */
export function forceCrossroads(s: DayState): void {
  if (s.pendingCrossroads) return;
  const next = s.scheduledCrossroads.find((c) => !c.done);
  if (next) next.atMs = Math.min(next.atMs, s.workedMs);
  else {
    const tipo: CrossroadsType = s.era >= 4 ? 'destino' : !s.build.pactId ? 'pacto' : s.chosenCards.length % 2 === 1 ? 'companero' : 'rumbo';
    s.scheduledCrossroads.push({ tipo, atMs: s.workedMs, done: false });
  }
  checkCrossroads(s);
}
