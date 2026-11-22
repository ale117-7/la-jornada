// Simulación pura (sin DOM). La usan el navegador, el escritorio y el simulador headless.
import { BAL } from '../data/balance';
import { CURRENCIES } from '../data/currencies';
import { depthAt, ERAS, eraStartZone, zoneInfo } from '../data/eras';
import { FAMILY_BY_ID, type FamilyDef } from '../data/families';
import { UPGRADES, type UpgradeDef } from '../data/upgrades';
import { addCurrency, baseAdvance, baseSpend, unlockCurrencies } from './base';
import { buildTags, checkMissions, recomputeBuild } from './build';
import { checkCrossroads, createSchedule, msToNextCrossroadsEvent, originPending } from './crossroads';
import { expectedHit, heroStats, mitigation, power, upgradeCost, type HeroStats } from './formulas';
import { novedad, pushHito, pushLog } from './log';
import { BASE_MODS, GOLPE_FUERTE_CADA } from './mods';
import { hashString, nextFloat } from './rng';
import type { Creature, DayState } from './types';
import { checkUnlocks, generateZone, hasUmbral, makeBoss } from './zone';
import { createWorld, msToNextWorldEvent, onKill, worldAdvance } from './world';
import { continuoMundo, continuoMundoMedio, golpeMundo, golpeMundoMedio } from './worldMods';

export { pushLog } from './log';

const EPS = 1e-6;

/** 'detallada' | 'rapida': último modo usado por advance() (para el panel debug). */
export let lastSimMode: 'detallada' | 'rapida' = 'detallada';

export interface DayOptions {
  /** Cartas vistas en días anteriores (de la Crónica). */
  seenCards?: string[];
  knownCombos?: string[];
  autoChooseMs?: number;
}

export function createDay(dateKey: string, nonce: number, seedOverride?: number, opts: DayOptions = {}): DayState {
  const seed = seedOverride ?? hashString(`${dateKey}#${nonce}`);
  const s: DayState = {
    dateKey,
    nonce,
    seed,
    rngState: seed,
    workedMs: 0,
    tickRemainderMs: 0,
    status: 'PAUSED',
    introSeen: false,
    zone: 0,
    era: 0,
    eraWait: false,
    boss: { deaths: 0, farmUntilMs: 0, farmFlip: 0, seen: false, seenAtMs: 0 },
    maxZone: 0,
    zoneDeaths: 0,
    hero: { spriteKey: 'hero', x: 0, hp: BAL.HERO_BASE.vida, atkTimerMs: 0, deadMs: 0, hits: 0 },
    creatures: [],
    corriente: null,
    familyIds: [],
    unlockedFamilies: [],
    gold: 0,
    totalGold: 0,
    kills: 0,
    deaths: 0,
    upgrades: {},
    aiTimerMs: 0,
    currencies: { materiales: 0, esencia: 0, ecos: 0, fragmentos: 0 },
    unlockedCurrencies: [],
    base: { buildings: {}, accMs: 0, craftMs: { arma: 0, armadura: 0, accesorio: 0 }, blessing: null, nextBlessingMs: 0 },
    equipment: { arma: null, armadura: null, accesorio: null },
    pets: [],
    meta: {},
    hitos: [],
    world: createWorld(seed),
    build: { entryId: null, chassisId: null, companions: [], regionId: null, pactId: null, relics: [], destinos: [], extras: [] },
    synergies: {},
    mods: { ...BASE_MODS },
    scheduledCrossroads: createSchedule(seed),
    pendingCrossroads: null,
    chosenCards: [],
    seenCards: opts.seenCards ?? [],
    knownCombos: opts.knownCombos ?? [],
    autoChooseMs: opts.autoChooseMs ?? 20 * 60_000,
    eventLog: [],
    lastTickRealTime: 0,
  };
  pushLog(s, 'La Grieta se ha reacomodado. Elige por dónde empieza el descenso.');
  checkCrossroads(s); // abre la Encrucijada de Origen
  return s;
}

export function depthMeters(s: DayState): number {
  return depthAt(s.zone, s.hero.x / BAL.ZONE_LENGTH_M);
}

export const isFarming = (s: DayState) => s.boss.farmUntilMs > 0;

/** ms hasta el próximo suceso ligado al reloj: Encrucijada o umbral de tiempo de la siguiente era. */
function msToNextTimeEvent(s: DayState): number {
  const era = s.eraWait ? Math.max(0, ERAS[s.era + 1].thresholdMs - s.workedMs) : Infinity;
  return Math.min(msToNextCrossroadsEvent(s), era, msToNextWorldEvent(s));
}

/** Avanza la simulación `gameMs` de tiempo trabajado. Sin Origen elegido, el día no empieza. */
export function advance(s: DayState, gameMs: number): void {
  if (!(gameMs > 0) || originPending(s)) return;
  if (gameMs > BAL.FAST_SIM_THRESHOLD_MS) {
    lastSimMode = 'rapida';
    // La simulación rápida se parte en los instantes en que ocurre algo ligado al reloj.
    let rem = gameMs;
    while (rem > 0) {
      timeChecks(s);
      const seg = Math.min(rem, Math.max(1, msToNextTimeEvent(s)));
      fastAdvance(s, seg);
      rem -= seg;
    }
    timeChecks(s);
    return;
  }
  lastSimMode = 'detallada';
  s.tickRemainderMs += gameMs;
  while (s.tickRemainderMs >= BAL.TICK_MS) {
    s.tickRemainderMs -= BAL.TICK_MS;
    tick(s);
  }
}

// ---------- eras ----------

function timeChecks(s: DayState): void {
  checkCrossroads(s);
  // Umbral de era ya derrotado: la siguiente era empieza en cuanto se cumple su tiempo.
  if (s.eraWait && s.workedMs >= ERAS[s.era + 1].thresholdMs) enterEra(s, s.era + 1);
}

function enterEra(s: DayState, era: number): void {
  const e = ERAS[era];
  s.era = era;
  s.eraWait = false;
  s.zone = eraStartZone(era);
  s.maxZone = Math.max(s.maxZone, s.zone);
  s.zoneDeaths = 0;
  s.boss = { deaths: 0, farmUntilMs: 0, farmFlip: 0, seen: false, seenAtMs: 0 };
  s.hero.x = 0;
  pushHito(s, `era${era + 1}`, `ERA ${e.romano} · ${e.capa.toUpperCase()} (−${Math.round(e.depthStart)} m). La Grieta cambia.`);
  unlockCurrencies(s);
  generateZone(s);
}

/** Fin del tramo: avanzar, o repetir si se acampa, se farmea o se espera a la siguiente era. */
function nextZone(s: DayState): void {
  s.hero.x = 0;
  s.zoneDeaths = 0;
  const b = s.boss;

  if (isFarming(s)) {
    // Farmeo de los 2 tramos anteriores; pasado el tiempo, se reintenta el Umbral.
    if (s.workedMs >= b.farmUntilMs) {
      b.farmUntilMs = 0;
      pushLog(s, 'El Descensor vuelve a intentar el Umbral.');
      generateZone(s);
    } else {
      b.farmFlip = 1 - b.farmFlip;
      generateZone(s, { level: s.zone - BAL.FARM_BACK + b.farmFlip });
    }
    return;
  }
  if (s.pendingCrossroads || s.eraWait) {
    generateZone(s, { boss: false });
    return;
  }

  const info = zoneInfo(s.zone);
  if (info.eraEnd) {
    // Umbral de era derrotado: hace falta además el tiempo trabajado de la siguiente era.
    if (s.workedMs >= ERAS[info.era + 1].thresholdMs) enterEra(s, info.era + 1);
    else {
      s.eraWait = true;
      pushLog(s, `El paso a ${ERAS[info.era + 1].capa} aún está sellado. La expedición explora las cornisas cercanas.`);
      generateZone(s, { boss: false });
    }
    return;
  }

  s.zone++;
  s.maxZone = Math.max(s.maxZone, s.zone);
  s.boss = { deaths: 0, farmUntilMs: 0, farmFlip: 0, seen: false, seenAtMs: 0 };
  pushLog(s, `Tramo ${s.zone + 1} alcanzado (−${Math.round(depthMeters(s))} m).`);
  recomputeBuild(s); // la Presión depende del tramo
  generateZone(s);
}

/** Atajos de sucesos (tren fantasma, viento del fondo…): avanza tramos de golpe sin saltarse ningún Umbral. */
function consumeSkips(s: DayState): void {
  const w = s.world;
  if (w.salto <= 0) return;
  if (isFarming(s) || s.pendingCrossroads || s.eraWait || s.hero.deadMs > 0) return;
  let done = 0;
  while (w.salto > 0 && !hasUmbral(s, s.zone) && !zoneInfo(s.zone).eraEnd) {
    s.zone++;
    w.salto--;
    done++;
  }
  w.salto = 0;
  if (!done) return;
  s.maxZone = Math.max(s.maxZone, s.zone);
  s.zoneDeaths = 0;
  s.boss = { deaths: 0, farmUntilMs: 0, farmFlip: 0, seen: false, seenAtMs: 0 };
  s.hero.x = 0;
  pushLog(s, `Atajo: el Descensor baja ${done} tramo${done > 1 ? 's' : ''} de golpe (tramo ${s.zone + 1}).`);
  recomputeBuild(s);
  generateZone(s);
}

// ---------- combate: piezas comunes ----------

/** Primera vez que el héroe tiene delante al Umbral del tramo. */
function noteBoss(s: DayState, c: Creature): void {
  if (!c.boss || s.boss.seen) return;
  s.boss.seen = true;
  s.boss.seenAtMs = s.workedMs;
  const info = zoneInfo(s.zone);
  const text = `☠ Umbral a la vista: ${c.nombre}.`;
  if (info.eraEnd) pushHito(s, `jefe${info.era + 1}_visto`, text);
  else {
    novedad(s);
    pushLog(s, text);
  }
}

function bossDefeated(s: DayState, c: Creature): void {
  const info = zoneInfo(s.zone);
  const k = (info.eraEnd ? 3 : 1) * s.mods.umbralBotinMult;
  for (const cur of CURRENCIES) addCurrency(s, cur.id, cur.porUmbral * k);
  const text = `☠ Umbral derrotado: ${c.nombre}${s.boss.deaths ? ` (tras ${s.boss.deaths} caídas)` : ''}.`;
  if (info.eraEnd) pushHito(s, `jefe${info.era + 1}`, text);
  else pushLog(s, text);
}

/** `expected`: usar valores medios (simulación rápida) en vez de tirar el dado. */
function killTarget(s: DayState, st: HeroStats, expected: boolean): void {
  const c = s.creatures.shift()!;
  const m = s.mods;
  let gold = c.gold * m.oroMult;
  if (m.dobleBotin > 0) gold *= expected ? 1 + m.dobleBotin : nextFloat(s) < m.dobleBotin ? 2 : 1;
  s.gold += gold;
  s.totalGold += gold;
  s.kills++;
  if (c.boss) bossDefeated(s, c);
  else for (const cur of CURRENCIES) if (cur.porBaja > 0) addCurrency(s, cur.id, cur.porBaja);
  // Modificadores: «Divisor» se parte en 2; «Explosivo» daña al héroe al morir.
  if (c.divide) {
    for (let i = 0; i < 2; i++) {
      s.creatures.unshift({ familyId: c.familyId, hib: c.hib, x: c.x + i * 3, hp: c.maxHp * 0.35, maxHp: c.maxHp * 0.35, atk: c.atk * 0.5, gold: c.gold * 0.3, atkTimerMs: FAMILY_BY_ID[c.familyId].atkIntervalMs, nombre: `Fragmento de ${c.nombre}`, size: 0.7 });
    }
  }
  if (c.explota) s.hero.hp -= c.atk * 2 * mitigation(st.defensa);
  onKill(s, c);
  if (s.world.dirty) {
    s.world.dirty = false;
    recomputeBuild(s);
  }
  if (m.curaAlMatar > 0) s.hero.hp = Math.min(st.vida, s.hero.hp + st.vida * m.curaAlMatar);
  const next = s.creatures[0];
  if (m.explosion > 0 && next) next.hp -= c.maxHp * m.explosion;
}

function die(s: DayState): void {
  s.deaths++;
  s.zoneDeaths++;
  s.hero.hp = 0;
  s.hero.deadMs = BAL.RESPAWN_MS;
  const b = s.boss;
  if (isFarming(s)) return;
  // Caída en el tramo (contra el Umbral o contra sus criaturas): a la 3.ª, el héroe retrocede
  // a farmear los tramos anteriores y luego reintenta contra un muro algo más débil.
  b.deaths++;
  if (b.seenAtMs === 0) b.seenAtMs = s.workedMs;
  const killer = s.creatures[0];
  // En el Brocal (Era I) el héroe insiste sin retirarse: el arranque es lento a propósito.
  if (s.era === 0 && !killer?.boss) {
    if (b.deaths === 1) pushLog(s, `El Descensor cayó en el tramo ${s.zone + 1}. Reaparece en 5 s.`);
    return;
  }
  // Cada retirada ante el mismo muro dura más: el héroe insiste menos y se prepara mejor.
  if (killer?.boss) {
    if (b.deaths % BAL.BOSS_DEATHS_TO_FARM !== 0) return;
    b.farmUntilMs = s.workedMs + BAL.FARM_MS * Math.min(BAL.FARM_MAX_MULT, b.deaths / BAL.BOSS_DEATHS_TO_FARM);
    pushLog(s, `${b.deaths} caídas contra ${killer.nombre}: el Descensor retrocede a farmear los tramos anteriores.`);
  } else {
    b.farmUntilMs = s.workedMs + BAL.ZONE_FARM_MS * Math.min(BAL.FARM_MAX_MULT, b.deaths);
    pushLog(s, `El Descensor cayó en el tramo ${s.zone + 1}: retrocede a farmear antes de volver a intentarlo.`);
  }
  b.farmFlip = -1; // el farmeo empieza al reaparecer
}

function respawn(s: DayState): void {
  const h = s.hero;
  h.deadMs = 0;
  h.x = 0;
  h.atkTimerMs = 0;
  h.hp = heroStats(s.upgrades, s.mods).vida;
  if (isFarming(s) && s.boss.farmFlip < 0) {
    s.boss.farmFlip = 0;
    generateZone(s, { level: s.zone - BAL.FARM_BACK });
    return;
  }
  // Las supervivientes se curan, pero quedan algo más débiles tras cada caída.
  for (let i = 0; i < s.creatures.length; i++) {
    const c = s.creatures[i];
    if (c.boss) {
      s.creatures[i] = makeBoss(s); // el Umbral se recalcula con su debuff progresivo
      continue;
    }
    c.maxHp *= BAL.DEATH_DEBUFF;
    c.atk *= BAL.DEATH_DEBUFF;
    c.hp = c.maxHp;
    c.atkTimerMs = FAMILY_BY_ID[c.familyId].atkIntervalMs;
  }
}

function hitOnHero(c: Creature, st: HeroStats): number {
  return c.atk * mitigation(st.defensa);
}

/** Las criaturas responden a cualquier distancia desde la que el héroe las ataque. */
export function effectiveRange(fam: FamilyDef, st: HeroStats): number {
  return Math.max(fam.range, st.alcance + 1);
}

function attackIntervalMs(fam: FamilyDef, s: DayState, iv = 1): number {
  return (fam.atkIntervalMs * iv) / (1 - s.mods.lentitud);
}

// ---------- IA de compras (7.4) ----------

export interface UpgradeOption {
  def: UpgradeDef;
  level: number;
  cost: number;
  /** Mejora relativa de poder (ln) por unidad de coste. */
  ratio: number;
}

export function upgradeOptions(s: DayState): UpgradeOption[] {
  const base = power(heroStats(s.upgrades, s.mods));
  return UPGRADES.map((def) => {
    const level = s.upgrades[def.id] ?? 0;
    const cost = upgradeCost(def, level) * s.mods.costeMejorasMult;
    const gain = Math.log(power(heroStats({ ...s.upgrades, [def.id]: level + 1 }, s.mods)) / base);
    return { def, level, cost, ratio: gain / cost };
  });
}

/** Compra la mejora con mejor valor/coste que se pueda pagar. */
function buyBest(s: DayState): boolean {
  let best: UpgradeOption | null = null;
  for (const o of upgradeOptions(s)) {
    if (o.cost > s.gold || !(o.ratio > 0)) continue;
    if (!best || o.ratio > best.ratio) best = o;
  }
  if (!best) return false;
  s.gold -= best.cost;
  s.upgrades[best.def.id] = best.level + 1;
  return true;
}

/** Una compra de la Base (edificio, mejora de era o mascota). */
function buyBase(s: DayState): boolean {
  if (!baseSpend(s, buildTags(s))) return false;
  recomputeBuild(s);
  return true;
}

// ---------- simulación detallada: un tick de 100 ms ----------

function tick(s: DayState): void {
  const dtMs = BAL.TICK_MS;
  const dt = dtMs / 1000;
  s.workedMs += dtMs;
  checkUnlocks(s);
  timeChecks(s);
  checkMissions(s);
  if (baseAdvance(s, dtMs)) recomputeBuild(s);
  if (worldAdvance(s, dtMs)) recomputeBuild(s);
  consumeSkips(s);

  s.aiTimerMs += dtMs;
  if (s.aiTimerMs >= BAL.AI_BUY_INTERVAL_MS) {
    s.aiTimerMs -= BAL.AI_BUY_INTERVAL_MS;
    buyBest(s);
    buyBase(s);
  }

  const h = s.hero;
  if (h.deadMs > 0) {
    h.deadMs -= dtMs;
    if (h.deadMs <= 0) respawn(s);
    return;
  }
  // Bloqueado por un suceso (derrumbe, contemplación…): nadie se mueve.
  if (s.world.pausaMs > 0) {
    s.world.pausaMs -= dtMs;
    return;
  }

  const m = s.mods;
  const st = heroStats(s.upgrades, m);
  h.hp = Math.min(st.vida, h.hp + st.vida * st.regeneracion * dt);

  const c = s.creatures[0];
  if (!c) {
    h.x += st.velocidad * dt;
    if (h.x >= BAL.ZONE_LENGTH_M - EPS) nextZone(s);
    return;
  }
  if (c.hp <= 0) {
    // Murió por una explosión o por daño reflejado.
    killTarget(s, st, false);
    if (h.hp <= 0) die(s);
    return;
  }

  const stopX = c.x - st.alcance;
  if (h.x < stopX - EPS) {
    h.x = Math.min(stopX, h.x + st.velocidad * dt);
    h.atkTimerMs = Math.max(0, h.atkTimerMs - dtMs);
  } else {
    noteBoss(s, c);
    h.atkTimerMs -= dtMs;
    while (h.atkTimerMs <= 0 && c.hp > 0) {
      const crit = nextFloat(s) < st.critico;
      let dmg = st.ataque * (crit ? st.danoCritico : 1);
      h.hits++;
      if (m.golpeFuerte > 0 && h.hits % GOLPE_FUERTE_CADA === 0) dmg *= 1 + m.golpeFuerte;
      // Mecánicas de sub-capa con ritmo propio: Carga (cada 10 golpes) y Pulso (latido).
      dmg *= golpeMundo(s, h.hits);
      c.hp -= dmg;
      h.atkTimerMs += 1000 / st.velocidadAtaque;
    }
    if (m.veneno > 0) c.hp -= st.ataque * m.veneno * dt * continuoMundo(s);
  }

  if (c.hp <= 0) {
    killTarget(s, st, false);
    if (h.hp <= 0) die(s);
    return;
  }

  const fam = FAMILY_BY_ID[c.familyId];
  if (c.x - h.x <= effectiveRange(fam, st) + EPS) {
    c.atkTimerMs -= dtMs;
    if (c.atkTimerMs <= 0) {
      c.atkTimerMs += attackIntervalMs(fam, s, c.iv);
      const dmg = hitOnHero(c, st);
      h.hp -= dmg;
      if (m.reflejo > 0) c.hp -= dmg * m.reflejo;
      if (h.hp <= 0) die(s);
    }
  }
}

// ---------- simulación rápida (3.2): por encuentros, con valores medios ----------
// Salta de suceso en suceso (llegar a la criatura, matarla, morir, cambiar de tramo)
// usando DPS contra HP en lugar de ticks. Mismo estado y mismas reglas que tick().

function fastAdvance(s: DayState, ms: number): void {
  let t = ms / 1000;
  let worked = s.workedMs;
  const spend = (dt: number) => {
    t -= dt;
    worked += dt * 1000;
    s.workedMs = worked;
    if (baseAdvance(s, dt * 1000)) recomputeBuild(s);
    if (worldAdvance(s, dt * 1000)) recomputeBuild(s);
  };
  const h = s.hero;
  h.atkTimerMs = 0;

  for (let guard = 0; t > 1e-9 && guard < 5_000_000; guard++) {
    checkUnlocks(s);
    checkMissions(s);
    if (s.eraWait && s.workedMs >= ERAS[s.era + 1].thresholdMs) enterEra(s, s.era + 1);
    consumeSkips(s);

    if (h.deadMs > 0) {
      const dt = Math.min(t, h.deadMs / 1000);
      h.deadMs -= dt * 1000;
      spend(dt);
      if (h.deadMs <= EPS) respawn(s);
      continue;
    }
    if (s.world.pausaMs > 0) {
      const dt = Math.min(t, s.world.pausaMs / 1000);
      s.world.pausaMs -= dt * 1000;
      spend(dt);
      continue;
    }

    const m = s.mods;
    const st = heroStats(s.upgrades, m);
    const regen = st.vida * st.regeneracion;
    const v = st.velocidad;
    const c = s.creatures[0];

    if (!c) {
      const dt = Math.min(t, (BAL.ZONE_LENGTH_M - h.x) / v);
      h.x += v * dt;
      h.hp = Math.min(st.vida, h.hp + regen * dt);
      spend(dt);
      if (h.x >= BAL.ZONE_LENGTH_M - EPS) nextZone(s);
      continue;
    }
    if (c.hp <= 0) {
      killTarget(s, st, true);
      if (h.hp <= 0) die(s);
      continue;
    }

    const fam = FAMILY_BY_ID[c.familyId];
    const cDps = (hitOnHero(c, st) * 1000) / attackIntervalMs(fam, s, c.iv);
    const stopX = c.x - st.alcance;

    if (h.x < stopX - EPS) {
      // Correr hasta la criatura; las de largo alcance disparan durante la aproximación.
      const full = (stopX - h.x) / v;
      const dt = Math.min(t, full);
      const x1 = dt >= full ? stopX : h.x + v * dt;
      const inRange = Math.max(0, x1 - Math.max(h.x, c.x - effectiveRange(fam, st))) / v;
      h.x = x1;
      h.hp = Math.min(st.vida, h.hp + regen * dt - cDps * inRange);
      spend(dt);
      if (h.hp <= 0) die(s);
      continue;
    }

    // Combate: daño por segundo contra HP, daño recibido neto contra vida.
    noteBoss(s, c);
    // Carga y Pulso, en media: rinden igual que golpe a golpe.
    const hit = expectedHit(st) * (1 + m.golpeFuerte / GOLPE_FUERTE_CADA) * golpeMundoMedio(s);
    const extraDps = st.ataque * m.veneno * continuoMundoMedio(s) + cDps * m.reflejo;
    const ttk =
      extraDps > 0
        ? c.hp / (hit * st.velocidadAtaque + extraDps)
        : Math.ceil(c.hp / hit - EPS) / st.velocidadAtaque;
    const net = regen - cDps;
    const ttd = net < 0 ? h.hp / -net : Infinity;
    const dt = Math.min(t, ttk, ttd);
    h.hp = Math.min(st.vida, h.hp + net * dt);
    spend(dt);
    if (dt >= ttk) {
      killTarget(s, st, true);
      if (h.hp <= 0) die(s);
      while (buyBest(s) || buyBase(s)) {
        /* la IA compra todo lo que pueda tras cada botín */
      }
    } else if (dt >= ttd) {
      die(s);
    } else {
      c.hp -= c.hp * (dt / ttk);
    }
  }

  s.workedMs = Math.round(worked);
}
