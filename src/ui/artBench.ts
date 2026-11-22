// Vitrina de arte (solo con ?debug=1): dibuja una copia del día con la capa, corriente, chasis,
// sucesos y Umbrales que se pidan, sin tocar la partida. Desde la consola:
//   __arte({ era: 2, corriente: 'A', chasis: 'raiz', sucesos: ['la_mirada'], overlay: false })
//   __arte.off()
import type { GameApi } from '../core/api';
import type { Creature, DayState } from '../core/types';
import { zoneInfo } from '../data/eras';
import { EVENT_BY_ID } from '../data/events';
import { FAMILIES } from '../data/families';
import { SUBLAYERS } from '../data/route';
import type { Corriente } from '../data/tags';
import { Renderer } from '../render/renderer';

export interface ArteOpts {
  era?: number;
  corriente?: Corriente;
  chasis?: string | null;
  /** Hora de Lo Hondo (5–15) para ver su sub-capa. */
  hora?: number;
  sucesos?: string[];
  /** Nombre del Umbral o élite que aparece al final (por defecto, el Umbral de era). */
  umbral?: string;
  companeros?: string[];
  overlay?: boolean;
  alto?: number;
}

export function artBench(game: GameApi): ((o?: ArteOpts) => string) & { off: () => void } {
  let timer = 0;
  const off = () => {
    clearInterval(timer);
    document.getElementById('arte-vitrina')?.remove();
  };
  const show = (o: ArteOpts = {}): string => {
    off();
    const s: DayState = structuredClone(game.day);
    const era = o.era ?? s.era;
    const corr = o.corriente ?? s.corriente ?? 'N';
    let z = 0;
    while (z < 3000 && zoneInfo(z).era < era) z++;
    if (era < 4) while (z < 3000 && !zoneInfo(z).eraEnd) z++;
    s.status = 'RUNNING';
    s.era = era;
    s.zone = z;
    s.corriente = corr;
    if (o.chasis !== undefined) s.build.chassisId = o.chasis;
    if (o.companeros) s.build.companions = o.companeros.map((id) => ({ ...(s.build.companions[0] ?? {}), id, evolved: false })) as DayState['build']['companions'];
    if (era >= 4 && o.hora) {
      const sub = SUBLAYERS.find((x) => x.hora === o.hora);
      if (sub) s.world.sub = { ...(s.world.sub ?? {}), hora: sub.hora, nombre: sub.nombre, mecanicas: [sub.mecanica], ciclo: 0 } as DayState['world']['sub'];
    }
    for (const id of o.sucesos ?? []) {
      s.world.eventos.push(id);
      s.world.eventosT.push(s.workedMs);
      s.world.buffs.push({ id: `${id}:vitrina`, nombre: EVENT_BY_ID[id].nombre, efectos: {}, untilMs: s.workedMs + 600_000 });
    }
    const fams = FAMILIES.filter((f) => f.corriente === corr).slice(0, 2);
    s.unlockedFamilies = fams.map((f) => f.id);
    s.hero.x = 380;
    const c = (familyId: string, x: number, extra: Partial<Creature> = {}): Creature => ({ familyId, x, hp: 70, maxHp: 100, atk: 1, gold: 1, atkTimerMs: 1000, nombre: '', ...extra });
    const boss = o.umbral ? c(fams[0].id, 470, { elite: true, nombre: o.umbral, size: 1.9 }) : c(fams[0].id, 470, { boss: true, nombre: era < 4 ? 'Umbral — vitrina' : 'Umbral de Lo Hondo (tramo 1)', size: 2.3 });
    s.creatures = [c(fams[0].id, 398), c(fams[1].id, 425), boss];
    const cv = document.createElement('canvas');
    cv.id = 'arte-vitrina';
    cv.style.cssText = `position:fixed;left:0;top:0;width:100vw;height:${o.alto ?? (o.overlay ? 110 : 320)}px;z-index:9999;background:#2b3340`;
    document.body.appendChild(cv);
    const r = new Renderer(cv);
    let last = performance.now();
    const tick = () => {
      const t = performance.now();
      s.workedMs += Math.min(100, t - last);
      last = t;
      r.draw(s, t, { overlay: !!o.overlay, leftInset: o.overlay ? 60 : 0 });
    };
    tick();
    timer = window.setInterval(tick, 33);
    return `${zoneInfo(z).era + 1}/${corr}`;
  };
  return Object.assign(show, { off });
}
