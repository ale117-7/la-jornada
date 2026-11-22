// Render en canvas. Solo lee el estado; no modifica la simulación.
// Arte placeholder: cada entidad se dibuja por su `spriteKey` (ver SPRITES); para el arte final
// basta con sustituir esas funciones. Los efectos (golpes, bajas, carteles…) salen de comparar
// cada estado con el anterior, así que funcionan igual en el panel y en el overlay.
import { synergyStatus } from '../core/build';
import { formatNumber, pad3 } from '../core/format';
import { heroStats, totalDps } from '../core/formulas';
import { depthMeters } from '../core/sim';
import type { DayState } from '../core/types';
import { CARGA, golpeMundoMedio } from '../core/worldMods';
import { BAL } from '../data/balance';
import { CHAIN_BY_ID } from '../data/chains';
import { COMPANION_BY_ID } from '../data/companions';
import { depthAt, ERAS, LAYER_VARIANTS, zoneInfo } from '../data/eras';
import { EVENT_BY_ID } from '../data/events';
import { FAMILY_BY_ID, type FamilyDef } from '../data/families';
import { MODIFIER_BY_ID } from '../data/modifiers';
import { MUTATION_BY_ID } from '../data/mutations';
import { MECHANIC_BY_ID, RECUERDOS, RECUERDOS_CADA } from '../data/route';
import { CORRIENTES, SYNERGY_BY_TAG } from '../data/tags';
import { MODIFIERS } from '../data/modifiers';
import { MUTATIONS } from '../data/mutations';
import { TAGS } from '../data/tags';
import { BUILDING_ART, CHAIN_NPC_ART, COMPANION_ART, EVENT_ICON, HERO_AYER, MOD_SHEET, modIcon, MUT_SHEET, mutIcon, NPC_ART, PET_ART, PLACA_SHEET, PLACAS, SYN_SHEET, synIcon } from './art/catalog';
import { creatureArt, heroArt, sceneryFor, type CreatureArt } from './art/pick';
import { animDuration, drawArt, drawFrame, frameOf, preload, resolve, type AnimName, type ArtDef, type DrawOpts, type Ref } from './art/sprites';
import { drawBackground } from './background';
import { Fx, fxRand, glowSprite } from './fx';
import { drawRibGate, floatOffset, hash, MECH_LOOK, mechChips, mechFar, mechFront, mechNear, mechState, type Actor, type Chip, type Mech, type View } from './mechanics';
import { activeScenes, drawBolt, drawScenes, SCENE_BUFF_NAMES, sceneChips, sceneMods } from './scenes';
import { mix, rgba, themeFor, variantTheme } from './theme';

export interface Pose {
  moving: boolean;
  /** 0–1: estocada (1 = recién golpeado). */
  attack: number;
  /** 0–1: destello de daño recibido. */
  hurt: number;
  accent: string;
}

type SpriteFn = (ctx: CanvasRenderingContext2D, x: number, groundY: number, u: number, timeMs: number, pose?: Pose) => void;

const C = { cyan: '#3fe0e6', magenta: '#ff3fa4', amber: '#ffb347', dim: '#7c879c', red: '#ff4d5e' };

/** Registro de sprites. Para cambiar el arte, sustituir estas funciones. */
const SPRITES: Record<string, SpriteFn> = {
  hero(ctx, x, gy, u, t, pose) {
    const moving = pose?.moving ?? false;
    const ph = t / 85;
    const bob = moving ? Math.abs(Math.sin(ph)) * u * 0.1 : Math.sin(t / 650) * u * 0.03;
    const lunge = (pose?.attack ?? 0) * u * 0.22;
    const bx = x + lunge;
    // Piernas: se alternan al correr.
    const step = moving ? Math.sin(ph) * u * 0.22 : 0;
    ctx.fillStyle = '#167a80';
    ctx.fillRect(bx - u * 0.28 + step, gy - u * 0.5, u * 0.22, u * 0.5);
    ctx.fillRect(bx + u * 0.06 - step, gy - u * 0.5, u * 0.22, u * 0.5);
    // Bufanda: ondea hacia atrás al correr.
    const accent = pose?.accent ?? C.magenta;
    ctx.fillStyle = accent;
    const wave = Math.sin(t / 70) * u * 0.08;
    const trail = moving ? u * 0.5 : u * 0.2;
    ctx.fillRect(bx - u * 0.3 - trail, gy - u * 1.42 - bob + wave, trail, u * 0.1);
    // Torso y cabeza.
    ctx.fillStyle = C.cyan;
    ctx.fillRect(bx - u * 0.32, gy - u * 1.45 - bob, u * 0.64, u * 0.98);
    ctx.fillRect(bx - u * 0.24, gy - u * 1.95 - bob, u * 0.48, u * 0.44);
    // Visor del chasis.
    ctx.fillStyle = accent;
    ctx.fillRect(bx, gy - u * 1.83 - bob, u * 0.26, u * 0.1);
    // Arma: se extiende en la estocada.
    const a = pose?.attack ?? 0;
    ctx.strokeStyle = '#e8fbff';
    ctx.lineWidth = Math.max(1.5, u * 0.11);
    ctx.beginPath();
    ctx.moveTo(bx + u * 0.3, gy - u * 1.15 - bob);
    ctx.lineTo(bx + u * (0.55 + 0.55 * a), gy - u * (1.45 - 0.35 * a) - bob);
    ctx.stroke();
    if (pose && pose.hurt > 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.75 * pose.hurt})`;
      ctx.fillRect(bx - u * 0.34, gy - u * 1.97 - bob, u * 0.68, u * 1.97 + bob);
    }
  },
};

/**
 * Aspecto de una criatura según la sub-capa o la escena: «malla» (Ensamblaje, sin terminar),
 * «antiguo» (Déjà vu), «holo» (Eclipse de Neón) y «plata» (Ciudad Espejo).
 */
type Look = '' | 'malla' | 'antiguo' | 'holo' | 'plata';

/** Placeholder de familia: forma + color de su corriente, con contorno, ojo y destello de daño. */
function drawFamily(ctx: CanvasRenderingContext2D, fam: FamilyDef, color: string, x: number, gy: number, u: number, t: number, hurt: number, glow: number, look: Look = ''): void {
  const own = SPRITES[fam.spriteKey];
  if (own) return own(ctx, x, gy, u, t);
  const hover = fam.vuela ? Math.sin(t / 300 + x * 0.05) * u * 0.2 : 0;
  const breathe = 1 + Math.sin(t / 420 + x) * 0.035;
  const y = fam.vuela ? gy - u * 1.9 + hover : gy - u * 0.75 * breathe;
  const r = u * 0.75;
  if (glow > 0) {
    ctx.globalAlpha = glow;
    ctx.drawImage(glowSprite(color), x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  switch (fam.forma) {
    case 'triangulo':
      ctx.moveTo(x - r, y);
      ctx.lineTo(x + r * 0.8, y - r * 0.8);
      ctx.lineTo(x + r * 0.8, y + r * 0.8);
      break;
    case 'rombo':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.7, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r * 0.7, y);
      break;
    case 'circulo':
      ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
      break;
    case 'cruz':
      ctx.rect(x - r, y - r * 0.25, r * 2, r * 0.5);
      ctx.rect(x - r * 0.25, y - r, r * 0.5, r * 2);
      break;
    default:
      ctx.rect(x - r * 0.8, y - r * 0.75 * breathe, r * 1.6, r * 1.5 * breathe);
  }
  ctx.closePath();
  const fill = hurt > 0 ? mix(color, '#ffffff', hurt * 0.85) : color;
  if (look === 'malla' || look === 'holo') {
    const fl = look === 'holo' && Math.sin(t / 47 + x) > 0.85 ? 0.35 : 1;
    ctx.fillStyle = rgba(fill, (look === 'holo' ? 0.3 : 0.14) * fl);
    ctx.fill();
    ctx.strokeStyle = look === 'holo' ? rgba('#ff3fa4', 0.85 * fl) : fill;
    ctx.lineWidth = Math.max(1, u * 0.06);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    if (look === 'malla') {
      // Sin terminar: la parte de abajo ya está hecha, el resto es malla; una línea la recorre.
      ctx.fillStyle = fill;
      ctx.fillRect(x - r, y + r * 0.25, r * 2, r);
      ctx.strokeStyle = rgba(fill, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        ctx.moveTo(x + k * r * 0.4, y - r);
        ctx.lineTo(x + k * r * 0.4, y + r);
        ctx.moveTo(x - r, y + k * r * 0.4);
        ctx.lineTo(x + r, y + k * r * 0.4);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(x - r, y - r + ((t / 700 + x * 0.01) % 1) * r * 1.25, r * 2, 1.5);
    } else {
      // Holograma: líneas de barrido que caen.
      ctx.fillStyle = rgba('#3fe0e6', 0.5 * fl);
      for (let k = y - r + ((t / 60) % 3); k < y + r; k += 3) ctx.fillRect(x - r, k, r * 2, 1);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = look === 'antiguo' ? mix(fill, '#b89c72', 0.6) : look === 'plata' ? mix(fill, '#dfe8ee', 0.6) : fill;
    ctx.fill();
    ctx.strokeStyle = look === 'antiguo' ? 'rgba(60,40,20,0.75)' : look === 'plata' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(1, u * 0.07);
    ctx.stroke();
    if (look === 'plata') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x + r * 0.15, y - r * 0.55, r * 0.35, Math.max(1, r * 0.08));
    }
  }
  // Ojo: mira al Descensor (a la izquierda).
  ctx.fillStyle = '#05060c';
  ctx.fillRect(x - r * 0.5, y - r * 0.2, r * 0.3, r * 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - r * 0.48, y - r * 0.18, r * 0.12, r * 0.12);
}

export interface RenderOptions {
  /** Modo overlay: fondo translúcido, sin señalética ni velo de pausa (los pone el overlay). */
  overlay?: boolean;
  /** Píxeles reservados a la izquierda para los controles del overlay. */
  leftInset?: number;
}

interface Target {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  color: string;
  k: number;
  boss: boolean;
  elite: boolean;
  nombre: string;
}

interface Prev {
  key: string;
  worked: number;
  kills: number;
  deaths: number;
  zone: number;
  era: number;
  sub: string | null;
  gold: number;
  upg: number;
  heroHp: number;
  dead: boolean;
  eventos: number;
  hits: number;
  recuerdos: number;
  target: Target | null;
}

const L = BAL.ZONE_LENGTH_M;
const pad2 = (n: number) => String(n).padStart(2, '0');
const MOD_INDEX: Record<string, number> = Object.fromEntries(MODIFIERS.map((m, i) => [m.id, i]));
const MUT_INDEX: Record<string, number> = Object.fromEntries(MUTATIONS.map((m, i) => [m.id, i]));

/** Placa de rango según la hondura del día: capas I–V y luego las horas 10 y 15 de Lo Hondo. */
function placaIndex(s: DayState): number {
  const h = s.workedMs / 3_600_000;
  if (s.era >= 4) return h >= 15.5 ? 6 : h >= 10 ? 5 : 4;
  return Math.max(0, s.era);
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private fx = new Fx();
  private prev: Prev | null = null;
  private lastT = 0;
  /** Distancia que muestra la cámara (suavizada entre estados). */
  private cam: number | null = null;
  private lastWorked = -1;
  private stateAt = 0;
  private heroHurtAt = -1e9;
  private lungeAt = -1e9;
  private targetHurtAt = -1e9;
  private targetHurtId = '';
  private dropAt = -1e9;
  private respawnAt = -1e9;
  private sparkleAt = -1e9;
  private dmgAt = -1e9;
  private dmgAcc = 0;
  private bossShown = '';
  private flipX = false;
  private flipY = false;
  /** Reloj de animación (el Jardín de Relojes lo frena). */
  private clock = 0;
  /** Posición de cámara al empezar cada escena anclada a la pared. */
  private anchors = new Map<string, number>();
  /** Rayo del estallido de Carga. */
  private boltFx = { life: 0, x: 0, y: 0, seed: 0 };
  /** Criaturas dibujadas en este frame (pantalla). */
  private actors: Actor[] = [];
  /** Glitch: fracción de letras corruptas y fotograma del ruido. */
  private glitchK = 0;
  private glitchTick = 0;
  /** Subidas de poder: el mayor DPS ya anunciado y cuándo se anunció. */
  private dpsShown = 0;
  private dpsAt = -1e9;
  /** Caída del Descensor (para su animación de deshacerse en luz). */
  private deathAt = -1e9;
  /** Arte del objetivo en el último frame (para dejar sus restos si era un Umbral o élite). */
  private lastTargetArt: { art: CreatureArt; k: number } | null = null;
  /** Umbrales y élites derrotados: su animación de derrota en el sitio donde cayeron. */
  private corpses: { def: ArtDef; wx: number; at: number; k: number }[] = [];
  /** Personaje del último encuentro: acompaña un rato al grupo. */
  private npc: { def: ArtDef; at: number } | null = null;
  /** Última vez que se pidieron por adelantado las hojas del día. */
  private warmAt = -1e9;
  /** Parte de cada cadena ya vista (para anunciar a sus personajes). */
  private chainParts = new Map<string, number>();

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** Texto legible aunque el lienzo esté espejado o invertido (Portal al Revés, Ciclos Invertidos). */
  private text(s: string, x: number, y: number): void {
    const ctx = this.ctx;
    if (this.glitchK > 0) s = corrupt(s, this.glitchTick, this.glitchK);
    if (!this.flipX && !this.flipY) return ctx.fillText(s, x, y);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
    const a = ctx.textAlign;
    if (this.flipX) ctx.textAlign = a === 'left' || a === 'start' ? 'right' : a === 'right' || a === 'end' ? 'left' : a;
    ctx.fillText(s, 0, 0);
    ctx.restore();
  }

  draw(s: DayState, timeMs: number, opts: RenderOptions = {}): void {
    const ov = opts.overlay === true;
    const cv = this.canvas;
    const running = s.status === 'RUNNING';
    if (s.workedMs !== this.lastWorked) {
      this.lastWorked = s.workedMs;
      this.stateAt = timeMs;
    }
    // Tiempo trabajado suavizado entre estados (el overlay recibe 10 por segundo).
    const worked = s.workedMs + (running ? Math.min(150, Math.max(0, timeMs - this.stateAt)) : 0);
    const mech = mechState(s, worked);
    const scenes = activeScenes(s, worked, this.anchors, this.cam ?? s.zone * L + s.hero.x);
    const sm = sceneMods(scenes);
    // Tinte genérico solo para los sucesos que no tienen escena propia.
    const visuals = new Set<string>();
    for (const b of s.world.buffs) if (b.visual && !SCENE_BUFF_NAMES.has(b.nombre)) visuals.add(b.visual);
    this.flipX = s.world.flags.espejo;
    this.flipY = (s.world.sub?.ciclo ?? 0) > 0;
    const transform = `scale(${this.flipX ? -1 : 1}, ${this.flipY ? -1 : 1})`;
    if (cv.style.transform !== transform) cv.style.transform = transform;
    // Glitch: en el panel, colores invertidos toda la hora y ráfagas que los tuercen; en el
    // overlay solo ráfagas de matiz (invertir la franja la volvería blanca sobre las apps).
    const glitchOn = mech.on.has('glitch') || visuals.has('glitch');
    const flick = mech.glitch > 0 && running && Math.floor(timeMs / 70) % 2 === 0;
    const filter = glitchOn ? (ov ? (flick ? 'hue-rotate(180deg) saturate(1.8)' : '') : flick ? 'hue-rotate(90deg) saturate(2)' : 'invert(1) hue-rotate(160deg)') : visuals.has('lento') ? 'saturate(0.35)' : '';
    if (cv.style.filter !== filter) cv.style.filter = filter;
    this.glitchK = mech.on.has('glitch') ? (mech.glitch ? 0.3 : 0.06) : 0;
    this.glitchTick = Math.floor(timeMs / 120);
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const hgt = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hgt * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(hgt * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    if (w < 2 || hgt < 2) return;

    const rawDt = running ? Math.min(100, Math.max(0, timeMs - this.lastT)) : 0;
    this.lastT = timeMs;
    this.clock += rawDt * sm.rate;
    const animT = running ? this.clock : 0;
    const dt = (rawDt / 1000) * sm.rate;

    const st = heroStats(s.upgrades, s.mods);
    const hero = s.hero;
    const ppm = w / 130; // píxeles por metro
    const u = ov ? Math.max(7, Math.min(30, hgt * 0.15, w / 26)) : Math.max(10, hgt * 0.07);
    const groundY = hgt * (ov ? 0.82 : 0.74);
    const heroSX = Math.max(w * 0.22, (opts.leftInset ?? 0) + u * 2.5);
    const depth = depthMeters(s);
    const dark = Math.min(1, depth / 15000);
    // Paleta: la de la corriente, llevada a la de la sub-capa o la escena (Déjà vu parte de la superficie).
    const looks = (s.world.sub?.mecanicas ?? []).map((id) => MECH_LOOK[id] ?? {});
    const theme = variantTheme(themeFor(s.corriente, mech.on.has('dejavu') ? 0.1 : dark), sm.theme ?? looks.find((l) => l.theme)?.theme);
    const target = s.creatures[0];
    const dead = hero.deadMs > 0;
    const stopX = target ? target.x - st.alcance : L;
    const moving = running && !dead && hero.x < stopX - 1e-3 && s.world.pausaMs <= 0;

    // ----- cámara: suaviza los saltos entre estados (el overlay recibe 10 por segundo) -----
    const trueDist = s.zone * L + hero.x;
    if (this.cam === null || !running || Math.abs(trueDist - this.cam) > 40) {
      // Salto grande (reaparecer, retirarse a farmear, atajo): fundido breve para taparlo.
      if (this.cam !== null && running && Math.abs(trueDist - this.cam) > 40) this.fx.wipe = { life: 0.35, max: 0.35 };
      this.cam = trueDist;
    } else {
      let goal = trueDist;
      if (moving) goal = Math.min(s.zone * L + stopX, trueDist + st.velocidad * Math.min(0.25, (timeMs - this.stateAt) / 1000));
      this.cam += (goal - this.cam) * (1 - Math.exp(-dt * 14));
    }
    const camX = this.cam - s.zone * L;
    const sx = (wx: number) => heroSX + (wx - camX) * ppm;

    this.detect(s, timeMs, { u, groundY, ppm, ov, hgt, st, mech });
    this.fx.update(dt);
    if (timeMs - this.warmAt > 2000) {
      this.warmAt = timeMs;
      this.warm(s);
    }
    const view: View = { ctx, w, hgt, groundY, u, ppm, t: animT, dist: this.cam, ov, heroSX, worked, theme };

    // ----- temblor -----
    const [shx, shy] = this.fx.shakeOffset(timeMs);
    ctx.save();
    ctx.translate(shx, shy);
    // Respiración: el terreno se expande y se contrae · Pulso: todo late con cada latido.
    const zoom = 1 + (mech.on.has('respiracion') ? 0.05 * mech.breath : 0) + (mech.on.has('pulso') ? 0.02 * Math.min(1, mech.beat) : 0);
    if (zoom !== 1) {
      ctx.translate(heroSX, groundY);
      ctx.scale(zoom, zoom);
      ctx.translate(-heroSX, -groundY);
    }

    // ----- fondo -----
    const dropK = Math.max(0, 1 - (timeMs - this.dropAt) / 1400);
    const montacargas = s.base.buildings.montacargas ?? 0;
    drawBackground(ctx, {
      w, hgt, groundY, dist: this.cam, ppm, u, t: animT, theme, corriente: s.corriente, dark, overlay: ov,
      drop: hgt * 0.9 * dropK * dropK, // las paredes suben mientras el Descensor baja
      base: montacargas ? Object.values(s.base.buildings).filter((n) => n > 0).length : 0,
      buildings: montacargas ? Object.entries(s.base.buildings).filter(([, n]) => n > 0) : [],
      scenery: sceneryFor(s),
      hondo: s.era >= 4,
      mezcla: mech.on.has('ensamblaje') ? { N: themeFor('N', dark), S: themeFor('S', dark), A: themeFor('A', dark) } : undefined,
      antiguo: mech.on.has('dejavu'),
      suelo: looks.find((l) => l.suelo)?.suelo,
      ambient: sm.ambient ?? looks.find((l) => l.ambient)?.ambient,
      breath: mech.breath,
      far: () => {
        mechFar(view, mech);
        drawScenes('far', view, scenes);
      },
      near: () => {
        mechNear(view, mech);
        drawScenes('near', view, scenes);
      },
    });

    const baseGroundY = groundY;

    // ----- fin del tramo -----
    const endX = sx(L);
    if (endX < w + 20) {
      ctx.fillStyle = rgba(theme.accent, 0.55);
      ctx.fillRect(endX, groundY - u * 3, 2, u * 3);
      ctx.fillStyle = rgba(theme.accent, 0.8);
      ctx.font = `${Math.round(u * 0.55)}px monospace`;
      this.text(`TRAMO ${pad3(s.zone + 2)}`, endX + 6, groundY - u * 2.5);
    }

    // ----- criaturas -----
    const glowK = Math.max(0, (dark - 0.4) * 1.2);
    let bossOnScreen: (typeof s.creatures)[number] | null = null;
    const flota = mech.on.has('flotacion');
    // Escalada: el Umbral de cada 5 tramos es una costilla (si el tramo no tiene ya uno propio).
    const ribZone = mech.on.has('escalada') && s.zone % 5 === 4 && !zoneInfo(s.zone).umbral;
    const look: Look = sm.look ?? (mech.on.has('ensamblaje') ? 'malla' : mech.on.has('dejavu') ? 'antiguo' : '');
    this.actors.length = 0;
    for (const c of s.creatures) {
      const fam = FAMILY_BY_ID[c.familyId];
      const hit = c === target && this.targetHurtId === this.idOf(c) ? Math.max(0, 1 - (timeMs - this.targetHurtAt) / 110) : 0;
      let x = sx(c.x) + hit * u * 0.18;
      if (x < -80 || x > w + 80) continue;
      const big = c.boss || c.elite;
      const k = c.size ?? 1;
      const color = CORRIENTES[c.hib ? FAMILY_BY_ID[c.hib].corriente : fam.corriente].color;
      // Flotación: llegan desde arriba o desde abajo · Canción: se mecen · Glitch: saltan.
      const groundY = baseGroundY + (flota && !big ? floatOffset(view, c.x, c.x - hero.x) : 0);
      if (sm.sway) x += Math.sin(animT / 600 + c.x) * u * 0.25;
      if (mech.glitch && hash(c.x + this.glitchTick) > 0.6) x += (hash(c.x * 3 + this.glitchTick) - 0.5) * u * 1.2;
      this.actors.push({ x, y: groundY - u * k * (fam.vuela ? 1.9 : 0.75), r: u * k * 0.75, color, big: !!big });
      if (big) {
        bossOnScreen ??= c;
        // Aura del Umbral: late como un corazón.
        const beat = 0.5 + 0.5 * Math.sin(animT / 260);
        ctx.globalAlpha = 0.35 + 0.25 * beat;
        ctx.drawImage(glowSprite(c.boss ? C.red : C.amber), x - u * k * 1.8, groundY - u * k * 2.6, u * k * 3.6, u * k * 3.6);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = rgba(c.boss ? C.red : C.amber, 0.25 + 0.3 * beat);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, groundY - u * k * 0.05, u * k * (1.1 + 0.1 * beat), u * k * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const art = creatureArt(s, c, color);
      if (c === target && art) this.lastTargetArt = { art, k };
      const drawnArt = !!art && this.drawCreature(art, c, x, groundY, u * k, animT, timeMs, hit, glowK, big ? '' : look, c === target, fam.vuela && !big, color);
      if (!drawnArt) {
        if (c.boss && ribZone) drawRibGate(ctx, x, groundY, u * k * 0.9, animT, c.hp / c.maxHp);
        else drawFamily(ctx, { ...fam, spriteKey: c.hib ? '' : fam.spriteKey }, color, x, groundY, u * k, animT, hit, glowK, big ? '' : look);
      }
      if (big && !drawnArt && !(c.boss && ribZone)) {
        // Corona de púas.
        ctx.fillStyle = c.boss ? C.red : C.amber;
        const cy = groundY - u * k * (fam.vuela ? 2.7 : 1.55);
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * u * k * 0.3 - u * k * 0.1, cy);
          ctx.lineTo(x + i * u * k * 0.3, cy - u * k * (i === 0 ? 0.45 : 0.3));
          ctx.lineTo(x + i * u * k * 0.3 + u * k * 0.1, cy);
          ctx.fill();
        }
      }
      // Modificadores: su icono (o un punto de color mientras carga).
      (c.mods ?? []).forEach((id, i) => {
        const n = (c.mods ?? []).length;
        const iz = u * (ov ? 0.55 : 0.5);
        const ix = x - ((n - 1) * iz * 1.1) / 2 + i * iz * 1.1;
        const iy = groundY - u * 2.9 * k - u * 0.12;
        if (!this.icon(MOD_SHEET, modIcon(MOD_INDEX[id] ?? 0), ix, iy, iz)) {
          ctx.fillStyle = MODIFIER_BY_ID[id].color;
          ctx.fillRect(ix - u * 0.14, iy - u * 0.33, u * 0.28, u * 0.28);
        }
      });
      const bw = u * 1.8 * k;
      const by = groundY - u * 2.9 * k;
      const bh = big ? Math.max(5, u * 0.3) : Math.max(3, u * 0.18);
      ctx.fillStyle = 'rgba(20,6,12,0.85)';
      ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = big ? (c.boss ? C.red : C.amber) : C.magenta;
      ctx.fillRect(x - bw / 2, by, bw * Math.max(0, c.hp / c.maxHp), bh);
      // Nombre: siempre el de Umbrales y especiales; el del objetivo si es raro.
      // En el panel, el nombre del Umbral ya va en la barra de arriba.
      const named = (big && (ov || bossOnScreen !== c)) || (c === target && (c.mods?.length || c.hib));
      if (named && c.nombre) {
        ctx.fillStyle = big ? (c.boss ? C.red : C.amber) : C.dim;
        ctx.font = `bold ${Math.round(u * 0.6)}px monospace`;
        ctx.textAlign = 'center';
        const label = big ? `☠ ${c.nombre}` : c.nombre;
        const half = ctx.measureText(label).width / 2;
        this.text(label, Math.max(half + 6 + (opts.leftInset ?? 0), Math.min(x, w - 10 - half)), by - u * 0.5);
        ctx.textAlign = 'left';
      }
    }

    // ----- restos de Umbrales y élites: su animación de derrota -----
    this.corpses = this.corpses.filter((cp) => {
      const el = timeMs - cp.at;
      const da = cp.def.anims.death;
      const dur = (da ? animDuration(da) : 0) + 900;
      if (el > dur) return false;
      const cx = sx(cp.wx - s.zone * L);
      const alpha = Math.max(0, Math.min(1, (dur - el) / 900));
      drawArt(ctx, cp.def, da ? 'death' : 'hurt', el, cx, baseGroundY + (da ? 0 : (el / dur) * u * 0.6), u * cp.k, true, { alpha, tint: { color: '#ffffff', k: Math.max(0, 1 - el / 250) * 0.8 } });
      return true;
    });

    // ----- tajo del Descensor sobre el objetivo -----
    const slash = Math.max(0, 1 - (timeMs - this.targetHurtAt) / 160);
    if (slash > 0 && target && !dead) {
      const tx = sx(target.x);
      const k = target.size ?? 1;
      ctx.strokeStyle = `rgba(232,251,255,${0.9 * slash})`;
      ctx.lineWidth = Math.max(1.5, u * 0.14 * slash);
      ctx.beginPath();
      ctx.arc(tx - u * k * 0.2, groundY - u * k * 0.9, u * k * 0.9, -2.2 + (1 - slash) * 0.8, -0.6 + (1 - slash) * 0.8);
      ctx.stroke();
    }
    // Marcas de la build sobre el objetivo (veneno, lentitud).
    if (target && !dead) {
      const tx = sx(target.x);
      if (s.mods.veneno > 0) {
        ctx.fillStyle = SYNERGY_BY_TAG.Veneno.color;
        for (let i = 0; i < 3; i++) ctx.fillRect(tx - u * 0.6 + i * u * 0.5, groundY - u * 3.3 - ((animT / 120 + i * 3) % 6), 3, 3);
      }
      if (s.mods.lentitud > 0) {
        ctx.strokeStyle = rgba(SYNERGY_BY_TAG.Hielo.color, 0.6);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tx - u, groundY - u * 2.6, u * 2, u * 2.6);
      }
    }

    // ----- compañeros: siguen al Descensor -----
    s.build.companions.forEach((cp, i) => {
      const def = COMPANION_BY_ID[cp.id];
      const cx = heroSX - u * 1.45 * (i + 1);
      const k = cp.evolved ? 1 : 0.78;
      const bob = moving ? Math.abs(Math.sin(animT / 95 + i)) * u * 0.08 : 0;
      const ca = COMPANION_ART[cp.id];
      if (ca) {
        if (cp.evolved) {
          ctx.globalAlpha = 0.35 + 0.15 * Math.sin(animT / 500 + i);
          ctx.drawImage(glowSprite(SYNERGY_BY_TAG[def.etiquetas[0]].color), cx - u * 1.3, groundY - u * 2.6, u * 2.6, u * 2.8);
          ctx.globalAlpha = 1;
        }
        const anim: AnimName = cp.evolved && ca.anims.evolved && (moving || ca.anims.evolved.frames.length === 1) ? 'evolved' : moving ? 'run' : 'idle';
        const idleBob = moving ? 0 : Math.sin(animT / 600 + i * 1.7) * u * 0.03;
        if (drawArt(ctx, ca, anim, animT + i * 137, cx, groundY + idleBob, u * (cp.evolved ? 1.12 : 1), false, { outline: { color: cp.evolved ? '#ffffff' : '#b8c4d8', px: Math.max(1, u * 0.045), alpha: cp.evolved ? 0.75 : 0.4 } })) return;
      }
      ctx.fillStyle = SYNERGY_BY_TAG[def.etiquetas[0]].color;
      ctx.fillRect(cx - u * 0.28 * k, groundY - u * 1.25 * k - bob, u * 0.56 * k, u * 1.25 * k);
      ctx.fillStyle = SYNERGY_BY_TAG[def.etiquetas[1]].color;
      ctx.fillRect(cx - u * 0.2 * k, groundY - u * 1.65 * k - bob, u * 0.4 * k, u * 0.36 * k);
      if (cp.evolved) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - u * 0.28, groundY - u * 1.25 - bob, u * 0.56, u * 1.25);
      }
    });

    // ----- personaje del último encuentro: acompaña al grupo un rato -----
    if (this.npc) {
      const el = timeMs - this.npc.at;
      const NPC_MS = 12_000;
      if (el > NPC_MS) this.npc = null;
      else {
        const nx = heroSX - u * 1.45 * (s.build.companions.length + 1) - u * 0.3;
        const a = Math.min(1, el / 500, (NPC_MS - el) / 1500);
        const anim: AnimName = moving && this.npc.def.anims.run ? 'run' : 'idle';
        drawArt(ctx, this.npc.def, anim, animT, nx, groundY, u * 0.85, false, { alpha: a, outline: { color: '#e8dcc0', px: Math.max(1, u * 0.045), alpha: 0.45 } });
      }
    }

    // ----- mascotas del Criadero: revolotean detrás del Descensor -----
    if (!dead) {
      s.pets.slice(0, 4).forEach((p, i) => {
        const pa = PET_ART[p.id];
        if (!pa) return;
        const px = heroSX - u * (0.9 + i * 0.75) + Math.sin(animT / 900 + i * 2) * u * 0.25;
        const py = groundY - u * (2.35 + 0.25 * (i % 2)) + Math.sin(animT / 380 + i * 1.3) * u * 0.18;
        drawArt(ctx, pa, 'idle', animT + i * 90, px, py, u * (0.9 + Math.min(10, p.level) * 0.03), false);
      });
    }

    // ----- sinergias: ×3 orbe que orbita, ×4 halo de transformación -----
    if (!dead) {
      synergyStatus(s).forEach((x, i) => {
        if (x.count < 3) return;
        const a = animT / 400 + i * 2.1;
        const ox = heroSX + Math.cos(a) * u * 1.1;
        const oy = groundY - u * 1.1 + Math.sin(a) * u * 0.9;
        ctx.drawImage(glowSprite(x.def.color), ox - u * 0.5, oy - u * 0.5, u, u);
        const iz = u * 0.62;
        if (!this.icon(SYN_SHEET, synIcon(TAGS.indexOf(x.def.tag)), ox, oy + iz / 2, iz)) {
          ctx.fillStyle = x.def.color;
          ctx.beginPath();
          ctx.arc(ox, oy, u * 0.14, 0, Math.PI * 2);
          ctx.fill();
        }
        if (x.count >= 4) {
          ctx.strokeStyle = rgba(x.def.color, 0.7);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(heroSX, groundY - u * 1.1, u * 1.3, u * 1.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    // ----- el Descensor -----
    const accent = s.corriente ? CORRIENTES[s.corriente].color : C.magenta;
    if (!dead) {
      ctx.globalAlpha = Math.min(0.8, 0.28 + glowK);
      ctx.drawImage(glowSprite(C.cyan), heroSX - u * 1.8, groundY - u * 2.8, u * 3.6, u * 3.6);
      ctx.globalAlpha = 1;
    }
    const respawn = Math.max(0, 1 - (timeMs - this.respawnAt) / 600);
    const attackK = Math.max(0, 1 - (timeMs - this.lungeAt) / 140);
    if (!dead && sm.ghost) {
      // El Descensor de Ayer corre a tu lado, translúcido, y golpea a la vez que tú.
      const gx = heroSX - u * 0.85 + Math.sin(animT / 900) * u * 0.2;
      ctx.globalAlpha = 0.3;
      ctx.drawImage(glowSprite('#9fd8ff'), gx - u * 1.4, groundY - u * 2.6, u * 2.8, u * 3);
      ctx.globalAlpha = 1;
      if (!drawArt(ctx, HERO_AYER, moving ? 'run' : 'idle', animT + 140, gx, groundY, u * 0.95, false, { alpha: 0.6 })) {
        ctx.globalAlpha = 0.3;
        SPRITES.hero(ctx, gx, groundY, u * 0.95, moving ? animT + 140 : 0, { moving, attack: Math.max(0, 1 - (timeMs - this.lungeAt - 90) / 140), hurt: 0, accent: '#cfe0ff' });
        ctx.globalAlpha = 1;
      }
      if (!ov) {
        ctx.fillStyle = 'rgba(207,224,255,0.6)';
        ctx.font = `${Math.round(u * 0.45)}px monospace`;
        this.text('AYER', gx - u * 0.45, groundY - u * 2.15);
      }
    }
    if (!dead && sm.halo) {
      // Lo que queda de la Canción.
      ctx.globalAlpha = 0.4 + 0.15 * Math.sin(animT / 500);
      ctx.drawImage(glowSprite('#ffd27a'), heroSX - u * 2, groundY - u * 3, u * 4, u * 4);
      ctx.globalAlpha = 1;
    }
    if (!dead) {
      // Sin gravedad: el Descensor flota y pelea girando.
      const fy = flota ? -u * 0.35 + Math.sin(animT / 700) * u * 0.2 : 0;
      const spin = flota && !moving && !!target ? animT / 260 : 0;
      ctx.save();
      if (fy || spin) {
        ctx.translate(heroSX, groundY - u + fy);
        ctx.rotate(spin);
        ctx.translate(-heroSX, -(groundY - u));
      }
      const hd = heroArt(s);
      const hurtK = Math.max(0, 1 - (timeMs - this.heroHurtAt) / 160);
      const drawnHero = this.drawHero(hd, heroSX, groundY, u, animT, timeMs, moving, attackK, hurtK, respawn);
      if (!drawnHero) {
        ctx.globalAlpha = respawn > 0 ? 1 - respawn * 0.6 : 1;
        (SPRITES[hero.spriteKey] ?? SPRITES.hero)(ctx, heroSX, groundY, u, moving ? animT : 0, { moving, attack: attackK, hurt: hurtK, accent });
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      // Mutaciones: sus marcas en fila sobre el Descensor (o puntos de color mientras cargan).
      const muts = s.world.mutaciones;
      muts.forEach((id, i) => {
        const iz = u * 0.42;
        const ix = heroSX - ((muts.length - 1) * iz) / 2 + i * iz;
        const iy = groundY - u * 2.72;
        if (!this.icon(MUT_SHEET, mutIcon(MUT_INDEX[id] ?? 0), ix, iy, iz)) {
          ctx.fillStyle = MUTATION_BY_ID[id].color;
          ctx.fillRect(heroSX - u * 0.3 + (i % 4) * u * 0.16, groundY - u * 1.35 + Math.floor(i / 4) * u * 0.22, u * 0.12, u * 0.12);
        }
      });
      if (respawn > 0) {
        // Columna de luz al reaparecer.
        ctx.fillStyle = `rgba(63,224,230,${0.45 * respawn})`;
        ctx.fillRect(heroSX - u * 0.5 * respawn, 0, u * respawn, groundY);
      }
    }
    const hbw = u * 2;
    const hby = groundY - u * 2.6;
    ctx.fillStyle = 'rgba(4,22,24,0.85)';
    ctx.fillRect(heroSX - hbw / 2 - 1, hby - 1, hbw + 2, Math.max(3, u * 0.18) + 2);
    ctx.fillStyle = hero.hp / st.vida < 0.3 ? C.red : C.cyan;
    ctx.fillRect(heroSX - hbw / 2, hby, hbw * Math.max(0, Math.min(1, hero.hp / st.vida)), Math.max(3, u * 0.18));
    if (dead) {
      // El Descensor cae y se deshace en luz.
      const hd = heroArt(s);
      const el = timeMs - this.deathAt;
      const da = hd.anims.death;
      const dur = da ? animDuration(da) : 500;
      const fadeK = Math.max(0, Math.min(1, 1 - (el - dur) / 700));
      if (fadeK > 0) {
        drawArt(ctx, hd, da ? 'death' : 'hurt', el, heroSX, groundY + (da ? 0 : Math.min(1, el / dur) * u * 0.3), u, false, {
          alpha: fadeK * (da ? 1 : 1 - Math.min(1, el / dur) * 0.5),
          tint: { color: '#9fefff', k: Math.min(0.85, el / (dur + 400)) },
        });
      }
      ctx.fillStyle = C.dim;
      ctx.font = `${Math.round(u * 0.6)}px monospace`;
      this.text(`Reaparece en ${(hero.deadMs / 1000).toFixed(1)} s`, heroSX - u, groundY - u * 3.1);
    }

    // ----- Reflejos: cada actor tiene su clon invertido bajo el suelo espejo -----
    if (mech.on.has('reflejos')) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, groundY + 1.5, w, hgt - groundY);
      ctx.clip();
      ctx.translate(0, groundY);
      ctx.scale(1, -0.6);
      ctx.translate(0, -groundY);
      ctx.globalAlpha = 0.5;
      for (const c of s.creatures) {
        const x = sx(c.x);
        if (x < -80 || x > w + 80) continue;
        const fam = FAMILY_BY_ID[c.familyId];
        const col = mix(CORRIENTES[c.hib ? FAMILY_BY_ID[c.hib].corriente : fam.corriente].color, '#cfe3ee', 0.35);
        const art = creatureArt(s, c, col);
        if (!art || !this.drawCreature(art, c, x, groundY, u * (c.size ?? 1), animT, timeMs, 0, 0, 'plata', false, fam.vuela && !c.boss && !c.elite, col)) {
          drawFamily(ctx, { ...fam, spriteKey: '' }, col, x, groundY, u * (c.size ?? 1), animT, 0, 0);
        }
      }
      if (!dead && !this.drawHero(heroArt(s), heroSX, groundY, u, animT, timeMs, moving, attackK, 0, 0)) {
        SPRITES.hero(ctx, heroSX, groundY, u, moving ? animT : 0, { moving, attack: attackK, hurt: 0, accent });
      }
      ctx.restore();
    }

    // ----- efectos: partículas, anillos, textos -----
    this.drawFx(sx, u);

    // ----- capas delanteras de mecánicas y escenas, y el rayo de Carga -----
    mechFront(view, mech, !dead);
    drawScenes('front', view, scenes, this.actors);
    if (this.boltFx.life > 0) {
      drawBolt(view, sx(this.boltFx.x), this.boltFx.y, this.boltFx.seed, this.boltFx.life, this.actors);
      this.boltFx.life -= dt;
    }

    // ----- tinte del suceso o la mecánica activa -----
    const tint = visuals.has('oscuro') ? 'rgba(0,0,0,0.5)' : visuals.has('sangre') ? 'rgba(160,20,30,0.18)' : visuals.has('niebla') ? 'rgba(200,210,225,0.2)' : visuals.has('brillo') ? 'rgba(255,220,120,0.1)' : visuals.has('lluvia') ? 'rgba(80,130,200,0.12)' : visuals.has('espejo') ? 'rgba(120,230,235,0.08)' : '';
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, hgt);
    }
    if (visuals.has('lluvia') && theme.ambient !== 'lluvia') {
      ctx.strokeStyle = 'rgba(160,200,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const rx = (i * 97 + animT * 0.25) % w;
        const ry = (i * 53 + animT * 0.5) % hgt;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 10);
      }
      ctx.stroke();
    }
    // Latido del Umbral en los bordes (solo panel: en el overlay taparía la app de debajo).
    if (!ov && bossOnScreen && running) {
      const beat = Math.max(0, Math.sin(animT / 260)) ** 6;
      const vg = ctx.createRadialGradient(w / 2, hgt / 2, Math.min(w, hgt) * 0.35, w / 2, hgt / 2, Math.max(w, hgt) * 0.75);
      vg.addColorStop(0, 'rgba(120,0,20,0)');
      vg.addColorStop(1, `rgba(120,0,20,${0.12 + 0.18 * beat})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, hgt);
    }
    ctx.restore(); // fin del temblor

    if (!ov) this.drawHud(s, w, hgt, u, theme.accent, bossOnScreen);
    this.drawChips([...mechChips(mech, s), ...sceneChips(scenes)], w, hgt, u, ov);
    this.drawCards(w, hgt, u, ov, opts.leftInset ?? 0);

    // Destello y fundido de pantalla completa.
    if (this.fx.flash.life > 0) {
      ctx.fillStyle = rgba(this.fx.flash.color, (ov ? 0.25 : 0.4) * (this.fx.flash.life / this.fx.flash.max));
      ctx.fillRect(0, 0, w, hgt);
    }
    if (this.fx.wipe.life > 0) {
      const k = this.fx.wipe.life / this.fx.wipe.max;
      ctx.fillStyle = `rgba(3,4,9,${(ov ? 0.6 : 0.85) * Math.sin(k * Math.PI)})`;
      ctx.fillRect(0, 0, w, hgt);
    }

    if (!ov && !running) {
      ctx.fillStyle = 'rgba(3,4,9,0.55)';
      ctx.fillRect(0, 0, w, hgt);
      ctx.fillStyle = C.amber;
      ctx.font = `bold ${Math.round(u * 1.4)}px monospace`;
      ctx.textAlign = 'center';
      this.text('⏸ EN PAUSA', w / 2, hgt / 2);
      ctx.textAlign = 'left';
    }
    // Glitch: franjas desplazadas y líneas de color (la interfaz se deforma).
    if (mech.glitch > 0 && running) this.glitchSlices(w, hgt, dpr, timeMs);
  }

  private glitchSlices(w: number, hgt: number, dpr: number, t: number): void {
    const ctx = this.ctx;
    const cv = this.canvas;
    const f = Math.floor(t / 60);
    for (let i = 0; i < 4; i++) {
      const y = hash(f * 4 + i) * hgt;
      const h = Math.min(hgt - y, 3 + hash(f * 4 + i + 0.5) * 12);
      if (h < 1) continue;
      ctx.drawImage(cv, 0, Math.round(y * dpr), cv.width, Math.max(1, Math.round(h * dpr)), (hash(f * 7 + i) - 0.5) * 36, y, w, h);
    }
    ctx.fillStyle = 'rgba(255,63,164,0.22)';
    ctx.fillRect(0, hash(f + 9) * hgt, w, 2);
    ctx.fillStyle = 'rgba(63,224,230,0.22)';
    ctx.fillRect(0, hash(f + 11) * hgt, w, 2);
  }

  /** Marcadores de la sub-capa y de las escenas largas: bajo la señalética (panel) o en la esquina (overlay). */
  private drawChips(chips: Chip[], w: number, hgt: number, u: number, ov: boolean): void {
    if (!chips.length) return;
    const ctx = this.ctx;
    if (ov) {
      if (this.fx.cards.some((c) => c.kind === 'aviso')) return;
      const fs = Math.max(9, Math.min(12, hgt * 0.095));
      ctx.font = `bold ${Math.round(fs)}px monospace`;
      ctx.textAlign = 'right';
      chips.slice(0, 2).forEach((c, i) => {
        const y = fs * 1.35 + i * fs * 1.45;
        const tw = ctx.measureText(c.text).width;
        ctx.fillStyle = 'rgba(3,4,9,0.6)';
        ctx.fillRect(w - 16 - tw, y - fs * 1.02, tw + 12, fs * 1.38);
        ctx.fillStyle = c.color;
        this.text(c.text, w - 10, y);
      });
      ctx.textAlign = 'left';
      return;
    }
    const fs = Math.max(10, u * 0.5);
    ctx.font = `bold ${Math.round(fs)}px monospace`;
    let y = 8 + u * 2.1 + 6;
    for (const c of chips.slice(0, 4)) {
      const tw = ctx.measureText(c.text).width;
      ctx.fillStyle = 'rgba(3,4,9,0.6)';
      ctx.fillRect(8, y, tw + 16, fs * 1.6);
      ctx.fillStyle = c.color;
      ctx.fillRect(8, y, 2, fs * 1.6);
      this.text(c.text, 16, y + fs * 1.15);
      y += fs * 1.6 + 4;
    }
  }

  /** Icono del atlas centrado en `cx` con la base en `bottom`, ajustado a `size` px. */
  private icon(sheet: string, ref: Ref, cx: number, bottom: number, size: number): boolean {
    const r = resolve(sheet, ref);
    if (!r) return false;
    const f = r.f;
    const k = size / Math.max(f[3], f[4]);
    this.ctx.drawImage(r.img, f[1], f[2], f[3], f[4], cx - (f[3] * k) / 2, bottom - f[4] * k, f[3] * k, f[4] * k);
    return true;
  }

  /** Criatura, élite o Umbral con su arte. false si su hoja aún no ha cargado. */
  private drawCreature(art: CreatureArt, c: DayState['creatures'][number], x: number, gy: number, uk: number, t: number, timeMs: number, hit: number, glow: number, look: Look, isTarget: boolean, flies: boolean, color: string): boolean {
    const ctx = this.ctx;
    const d = art.def;
    let anim: AnimName = 'idle';
    let at = t + ((c.x * 37) % 1000);
    const hpK = c.hp / c.maxHp;
    if (art.costilla) anim = hpK > 0.6 ? 'idle' : hpK > 0.25 ? 'mid' : 'broken';
    else if (isTarget && d.anims.attack && timeMs - this.heroHurtAt < animDuration(d.anims.attack) + 80) {
      anim = 'attack';
      at = timeMs - this.heroHurtAt;
    } else if (hit > 0.3 && d.anims.hurt) anim = 'hurt';
    const single = (d.anims[anim]?.frames.length ?? 1) === 1;
    const hover = flies ? Math.sin(t / 300 + x * 0.05) * uk * 0.2 : 0;
    const bob = !flies && anim === 'idle' && single ? Math.sin(t / 420 + c.x) * uk * 0.035 : 0;
    const y = flies ? gy - uk * 1.15 + hover : gy + bob;
    if (glow > 0) {
      const r = uk * 0.75;
      const cy = y - (d.h * uk) / 2;
      ctx.globalAlpha = glow;
      ctx.drawImage(glowSprite(color), x - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
      ctx.globalAlpha = 1;
    }
    const o: DrawOpts = { tint: { color: '#ffffff', k: hit * 0.85 }, outline: { color: c.boss ? '#ff4d5e' : c.elite ? '#ffb347' : color, px: Math.max(1, uk * 0.045), alpha: 0.55 } };
    const flick = look === 'holo' && Math.sin(t / 47 + x) > 0.85 ? 0.35 : 1;
    if (look === 'malla') {
      o.alpha = 0.5;
      o.tint2 = { color: '#9fd8ff', k: 0.4 };
    } else if (look === 'antiguo') o.tint2 = { color: '#b89c72', k: 0.55 };
    else if (look === 'holo') {
      o.alpha = 0.55 * flick;
      o.tint2 = { color: '#ff3fa4', k: 0.45 };
    } else if (look === 'plata') o.tint2 = { color: '#dfe8ee', k: 0.6 };
    else if (art.hibTint) o.tint2 = { color: art.hibTint, k: 0.38 };
    let ok: boolean;
    if (art.hib && anim === 'idle') {
      const f = frameOf(d.sheet, art.hib);
      ok = !!f && drawFrame(ctx, d.sheet, art.hib, x, y, (d.h * uk) / f[4], { ...o, flip: !d.left });
    } else ok = drawArt(ctx, d, anim, at, x, y, uk, true, o);
    if (ok && look === 'malla') {
      // Sin terminar: una línea de escaneo recorre la criatura.
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x - uk * 0.8, y - d.h * uk + ((t / 700 + x * 0.01) % 1) * d.h * uk, uk * 1.6, 1.5);
    } else if (ok && look === 'holo') {
      ctx.fillStyle = rgba('#3fe0e6', 0.35 * flick);
      for (let k = y - d.h * uk + ((t / 60) % 3); k < y; k += 3) ctx.fillRect(x - uk * 0.8, k, uk * 1.6, 1);
    }
    return ok;
  }

  /** El Descensor con su arte. false si su hoja aún no ha cargado. */
  private drawHero(hd: ArtDef, x: number, gy: number, u: number, t: number, timeMs: number, moving: boolean, attackK: number, hurtK: number, respawn: number): boolean {
    let anim: AnimName = moving ? 'run' : 'idle';
    let at = t;
    const rs = timeMs - this.respawnAt;
    if (respawn > 0 && hd.anims.respawn && rs < animDuration(hd.anims.respawn)) {
      anim = 'respawn';
      at = rs;
    } else if (hurtK > 0.4 && hd.anims.hurt && !moving) anim = 'hurt';
    else if (hd.anims.attack && timeMs - this.lungeAt < Math.max(150, animDuration(hd.anims.attack))) {
      anim = 'attack';
      at = timeMs - this.lungeAt;
    }
    const lunge = hd.anims.attack ? attackK * u * 0.08 : attackK * u * 0.22;
    const single = (hd.anims[anim]?.frames.length ?? 1) === 1;
    const bob = anim === 'idle' && single ? -Math.abs(Math.sin(t / 650)) * u * 0.035 : 0;
    const alpha = respawn > 0 && anim !== 'respawn' ? 1 - respawn * 0.6 : 1;
    return drawArt(this.ctx, hd, anim, at, x + lunge, gy + bob, u, false, { alpha, tint: { color: '#ffffff', k: hurtK * 0.7 }, outline: { color: '#d8f6ff', px: Math.max(1, u * 0.055), alpha: 0.6 } });
  }

  /** Pide por adelantado las hojas que el día va a necesitar pronto (sin parpadeos al aparecer). */
  private warm(s: DayState): void {
    const ids = new Set<string>([heroArt(s).sheet, sceneryFor(s), MOD_SHEET, SYN_SHEET, MUT_SHEET, PLACA_SHEET]);
    for (const c of s.creatures) {
      const a = creatureArt(s, c);
      if (a) ids.add(a.def.sheet);
    }
    for (const cp of s.build.companions) if (COMPANION_ART[cp.id]) ids.add(COMPANION_ART[cp.id].sheet);
    for (const p of s.pets) if (PET_ART[p.id]) ids.add(PET_ART[p.id].sheet);
    for (const id of Object.keys(s.base.buildings)) if (BUILDING_ART[id]) ids.add(BUILDING_ART[id].sheet);
    for (const id of ids) preload(id);
  }

  private idOf(c: { familyId: string; x: number; maxHp: number }): string {
    return `${c.familyId}|${Math.round(c.x * 10)}|${Math.round(c.maxHp)}`;
  }

  /** Compara con el estado anterior y genera los efectos de lo que acaba de pasar. */
  private detect(s: DayState, now: number, g: { u: number; groundY: number; ppm: number; ov: boolean; hgt: number; st: ReturnType<typeof heroStats>; mech: Mech }): void {
    const { u, groundY } = g;
    const t0 = s.creatures[0];
    const cur: Prev = {
      key: `${s.dateKey}#${s.seed}`,
      worked: s.workedMs,
      kills: s.kills,
      deaths: s.deaths,
      zone: s.zone,
      era: s.era,
      sub: s.world.sub?.nombre ?? null,
      gold: s.totalGold,
      upg: Object.values(s.upgrades).reduce((a, b) => a + b, 0),
      heroHp: s.hero.hp,
      dead: s.hero.deadMs > 0,
      eventos: s.world.eventos.length,
      hits: s.hero.hits,
      recuerdos: s.world.recuerdos,
      target: t0
        ? {
            id: this.idOf(t0),
            x: t0.x,
            y: groundY - u * (t0.size ?? 1) * (FAMILY_BY_ID[t0.familyId].vuela ? 1.9 : 0.8),
            hp: t0.hp,
            maxHp: t0.maxHp,
            color: CORRIENTES[t0.hib ? FAMILY_BY_ID[t0.hib].corriente : FAMILY_BY_ID[t0.familyId].corriente].color,
            k: t0.size ?? 1,
            boss: !!t0.boss,
            elite: !!t0.elite,
            nombre: t0.nombre ?? '',
          }
        : null,
    };
    const p = this.prev;
    this.prev = cur;
    if (!p || p.key !== cur.key || cur.worked < p.worked) {
      // Día nuevo o reiniciado: nada que comparar.
      this.fx.clear();
      this.corpses = [];
      this.npc = null;
      this.chainParts = new Map(s.world.cadenas.map((c) => [c.id, c.parte]));
      this.cam = null;
      this.bossShown = '';
      this.dpsShown = 0;
      return;
    }
    if (cur.worked === p.worked) return;
    // Mucho tiempo de golpe (vuelta de una pestaña oculta, velocidad de depuración): solo carteles.
    const catchup = cur.worked - p.worked > 1500;
    const fx = this.fx;
    const big = g.hgt >= 150;

    // Nueva capa del abismo o nueva sub-capa de Lo Hondo: cartel y descenso.
    if (cur.era > p.era) {
      const e = ERAS[cur.era];
      fx.card({
        kind: 'era',
        kicker: `CAPA ${pad2(cur.era + 1)} · −${Math.round(e.depthStart).toLocaleString('es-ES')} M`,
        title: e.capa.toUpperCase(),
        line: cur.era < 4 && s.corriente ? LAYER_VARIANTS[cur.era][s.corriente] : 'El fondo no existe.',
        color: s.corriente ? CORRIENTES[s.corriente].color : C.cyan,
        max: 4.2,
      });
      this.dropAt = now;
      fx.doFlash('#ffffff', 0.35);
    }
    if (cur.sub && cur.sub !== p.sub) {
      const sub = s.world.sub!;
      fx.card({
        kind: 'era',
        kicker: cur.era > p.era ? `CAPA 05 · LO HONDO · −${Math.round(ERAS[4].depthStart).toLocaleString('es-ES')} M` : `LO HONDO · HORA ${sub.hora}${sub.ciclo ? ` · CICLO ${sub.ciclo}` : ''}`,
        title: sub.nombre.toUpperCase(),
        line: sub.mecanicas.map((id) => MECHANIC_BY_ID[id].nombre).join(' + '),
        color: s.corriente ? CORRIENTES[s.corriente].color : C.cyan,
        max: 4.2,
      });
      this.dropAt = now;
    }
    // Un suceso nuevo: aviso arriba a la derecha (las rarezas, doradas y más largas).
    if (cur.eventos > p.eventos) {
      const def = EVENT_BY_ID[s.world.eventos[cur.eventos - 1]];
      if (def) {
        const rara = def.categoria === 'Rarezas';
        const color = rara ? '#ffd27a' : def.capa ? '#b48cff' : def.categoria === 'Peligros' ? C.red : C.cyan;
        const kicker = rara ? '✦ RAREZA' : def.capa ? '◈ EVENTO DE CAPA' : `◈ ${def.categoria.toUpperCase()}`;
        const npc = NPC_ART[def.id];
        const ic = EVENT_ICON[def.id];
        const icon = npc?.portrait ? { sheet: npc.sheet, ref: npc.portrait } : ic ? { sheet: ic[0], ref: [ic[1], ic[2]] as Ref } : undefined;
        fx.card({ kind: 'aviso', kicker, title: def.nombre, line: def.textoLog, color, max: rara ? 6 : 4, icon });
        if (npc && !catchup) this.npc = { def: npc, at: now };
        if (rara && !catchup) fx.doFlash('#ffd27a', 0.3);
      }
    }
    // Cadenas con personaje (El Rival, El Niño de Hojalata, El Huésped): su aviso y su figura.
    for (const ch of s.world.cadenas) {
      const before = this.chainParts.get(ch.id) ?? 0;
      this.chainParts.set(ch.id, ch.parte);
      const npc = CHAIN_NPC_ART[ch.id];
      if (!npc || ch.parte <= before || catchup) continue;
      const def = CHAIN_BY_ID[ch.id];
      const part = def.partes[ch.parte - 1];
      fx.card({ kind: 'aviso', kicker: `📜 ${def.nombre.toUpperCase()} · ${ch.parte}/${def.partes.length}`, title: def.nombre, line: part?.textoLog ?? '', color: '#e8dcc0', max: 5, icon: { sheet: npc.sheet, ref: npc.portrait ?? npc.ref } });
      this.npc = { def: npc, at: now };
    }
    // Recuerdos: cada 40 bajas se lee un fragmento.
    const frag = Math.floor(cur.recuerdos / RECUERDOS_CADA);
    if (frag > Math.floor(p.recuerdos / RECUERDOS_CADA)) {
      fx.card({ kind: 'aviso', kicker: '◈ RECUERDO', title: `Fragmento ${frag}`, line: RECUERDOS[frag % RECUERDOS.length].replace(/^Recuerdo:\s*/, ''), color: '#9fe6ff', max: 6 });
    }
    // Subidas de poder visibles: cuando el DPS supera en un 25 % el mayor ya anunciado.
    const dps = totalDps(g.st, s.mods) * golpeMundoMedio(s);
    if (catchup || this.dpsShown <= 0) {
      this.dpsShown = Math.max(this.dpsShown, dps);
      if (catchup) return;
    } else if (dps >= this.dpsShown * 1.25 && now - this.dpsAt > 15_000 && !cur.dead) {
      const pct = Math.round((dps / this.dpsShown - 1) * 100);
      this.dpsShown = dps;
      this.dpsAt = now;
      const hx = this.cam !== null ? this.cam - s.zone * L : s.hero.x;
      fx.text(hx, groundY - u * 3.3, `▲ DPS +${pct.toLocaleString('es-ES')} %`, C.cyan, Math.max(10, u * 0.6), 1.6);
      fx.ring(hx, groundY - u, u * 0.6, u * 2.2, C.cyan, 0.6, 2);
    }

    // Bajas: estallido con el color de su corriente y la moneda que suelta.
    if (cur.kills > p.kills && p.target) {
      const d = p.target;
      const n = d.boss ? 46 : d.elite ? 28 : 13;
      fx.burst(d.x, d.y, d.color, n, { speed: d.boss ? 150 : 85, size: (d.boss ? 4.5 : 3) * Math.max(0.7, u / 14), up: 40, glow: d.boss });
      fx.burst(d.x, d.y, '#ffffff', d.boss ? 10 : 3, { speed: 50, size: 2, life: 0.35 });
      fx.ring(d.x, d.y, u * 0.3 * d.k, u * 1.6 * d.k, d.color, d.boss ? 0.7 : 0.4, d.boss ? 3 : 2);
      if ((d.boss || d.elite) && this.lastTargetArt && !catchup) {
        this.corpses.push({ def: this.lastTargetArt.art.def, wx: p.zone * L + d.x, at: now, k: this.lastTargetArt.k });
      }
      const dg = cur.gold - p.gold;
      if (dg > 0 && (big || d.boss || d.elite)) fx.text(d.x, d.y - u * d.k, `+${formatNumber(dg)}`, C.amber, Math.max(9, u * 0.55), 1.1);
      if (d.boss) {
        fx.doShake(Math.max(4, u * 0.45), 0.6);
        fx.doFlash('#ffffff', 0.3);
        fx.card({ kind: 'umbral', kicker: '☠ UMBRAL DERROTADO', title: d.nombre, line: '', color: C.amber, max: 2.8 });
      } else if (d.elite) fx.doShake(Math.max(2, u * 0.2), 0.3);
      // Recuerdos: cada baja suelta una luz pálida que sube.
      if (g.mech.on.has('recuerdos') && fx.particles.length < 170) {
        fx.particles.push({ x: d.x, y: d.y, vx: 0, vy: -28, life: 1.8, max: 1.8, size: 3, color: '#cfefff', grav: -10, world: true, glow: true });
      }
      // Reflejos: cae también el clon de debajo y suelta su parte del botín.
      if (g.mech.on.has('reflejos')) {
        const ry = groundY + (groundY - d.y) * 0.6;
        fx.burst(d.x, ry, '#dfe8ee', 10, { speed: 70, size: 2.5, up: -10, grav: 60, life: 0.6 });
        const share = (cur.gold - p.gold) * (0.3 / 1.3);
        if (share > 0 && big) fx.text(d.x + 1.5, ry + u * 0.9, `+${formatNumber(share)}`, '#cfe3ee', Math.max(9, u * 0.45), 1);
      }
    }

    // Carga: al décimo golpe estalla la electricidad (rayo sobre el objetivo).
    if (g.mech.on.has('carga') && Math.floor(cur.hits / CARGA.cada) > Math.floor(p.hits / CARGA.cada)) {
      const tg = cur.kills > p.kills ? p.target : (cur.target ?? p.target);
      if (tg) {
        this.boltFx = { life: 0.3, x: tg.x, y: tg.y, seed: cur.hits };
        fx.doFlash('#9fd8ff', 0.12);
        fx.doShake(Math.max(2, u * 0.2), 0.2);
        fx.text(tg.x, tg.y - u * tg.k * 1.4, `⚡×${CARGA.mult}`, '#e8f6ff', Math.max(10, u * 0.7), 0.9);
      }
    }

    // El Descensor golpea: tajo, estocada y destello en el objetivo.
    if (cur.target && p.target && cur.target.id === p.target.id && cur.target.hp < p.target.hp - 1e-9) {
      this.targetHurtAt = now;
      this.targetHurtId = cur.target.id;
      this.lungeAt = now;
      fx.burst(cur.target.x - 0.4, cur.target.y, '#e8fbff', 2, { speed: 70, size: 2, life: 0.25, grav: 60 });
      if (big) {
        this.dmgAcc += p.target.hp - cur.target.hp;
        if (now - this.dmgAt > 160) {
          fx.text(cur.target.x, cur.target.y - u * cur.target.k * 0.9, formatNumber(this.dmgAcc), '#e8fbff', Math.max(9, u * 0.5), 0.7);
          this.dmgAcc = 0;
          this.dmgAt = now;
        }
      }
    }

    // El Descensor recibe daño.
    const vida = g.st.vida;
    if (!cur.dead && !p.dead && cur.heroHp < p.heroHp - vida * 0.01) {
      this.heroHurtAt = now;
      const hx = this.cam !== null ? this.cam - s.zone * L : s.hero.x;
      fx.burst(hx + 0.6, groundY - u * 1.2, C.red, 4, { speed: 60, size: 2.5, life: 0.4 });
      if ((p.heroHp - cur.heroHp) / vida > 0.15) fx.doShake(Math.max(2, u * 0.18), 0.25);
    }
    // Caída: el Descensor se deshace en luz.
    if (cur.deaths > p.deaths) {
      this.deathAt = now;
      const hx = this.cam !== null ? this.cam - s.zone * L : s.hero.x;
      fx.burst(hx, groundY - u, C.cyan, 26, { speed: 110, size: 3 * Math.max(0.7, u / 14), up: 60, glow: true, life: 0.9 });
      fx.doFlash(C.red, 0.35);
      fx.doShake(Math.max(3, u * 0.3), 0.4);
    }
    if (p.dead && !cur.dead) this.respawnAt = now;

    // Mejoras compradas: chispas que suben.
    if (cur.upg > p.upg && now - this.sparkleAt > 700) {
      this.sparkleAt = now;
      const hx = this.cam !== null ? this.cam - s.zone * L : s.hero.x;
      for (let i = 0; i < 5; i++) {
        fx.particles.push({ x: hx + (fxRand() - 0.5) * 1.5, y: groundY - u * (0.4 + fxRand() * 1.2), vx: 0, vy: -40 - fxRand() * 30, life: 0.8, max: 0.8, size: 2, color: C.cyan, grav: -20, world: true, glow: false });
      }
    }

    // Un Umbral aparece a la vista.
    const boss = s.creatures.find((c) => c.boss);
    const bossKey = boss ? `${s.zone}:${boss.nombre}` : '';
    if (boss && bossKey !== this.bossShown && boss.x - s.hero.x < 130 * 0.85) {
      this.bossShown = bossKey;
      const ba = creatureArt(s, boss)?.def;
      const icon = ba ? { sheet: ba.sheet, ref: ba.portrait ?? ba.ref } : undefined;
      fx.card({ kind: 'umbral', kicker: '☠ UMBRAL A LA VISTA', title: boss.nombre ?? 'Umbral', line: '', color: C.red, max: 2.6, icon });
      fx.doShake(Math.max(2, u * 0.2), 0.35);
    }
  }

  private drawFx(sx: (wx: number) => number, u: number): void {
    const ctx = this.ctx;
    for (const r of this.fx.rings) {
      const k = 1 - r.life / r.max;
      ctx.strokeStyle = rgba(r.color, 0.8 * (1 - k));
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(sx(r.wx), r.y, r.r0 + (r.r1 - r.r0) * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.fx.particles) {
      const x = p.world ? sx(p.x) : p.x;
      const a = Math.min(1, (p.life / p.max) * 1.6);
      if (p.glow) {
        ctx.globalAlpha = a * 0.6;
        const gs = p.size * 5;
        ctx.drawImage(glowSprite(p.color), x - gs / 2, p.y - gs / 2, gs, gs);
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.fx.texts) {
      const k = 1 - t.life / t.max;
      ctx.globalAlpha = Math.min(1, (t.life / t.max) * 2.5);
      ctx.font = `bold ${Math.round(t.size)}px monospace`;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.text(t.text, sx(t.wx) + 1, t.y - k * u * 1.6 + 1);
      ctx.fillStyle = t.color;
      this.text(t.text, sx(t.wx), t.y - k * u * 1.6);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  /** Señalética, medidor de profundidad y barra del Umbral (solo en el panel). */
  private drawHud(s: DayState, w: number, hgt: number, u: number, accent: string, boss: DayState['creatures'][number] | null): void {
    const ctx = this.ctx;
    const depth = Math.round(depthMeters(s));
    const capa = s.world.sub ? s.world.sub.nombre.toUpperCase() : ERAS[s.era].capa.toUpperCase();
    ctx.font = `bold ${Math.round(u * 0.75)}px monospace`;
    const line = `CAPA ${pad2(s.era + 1)} · ${capa}`;
    const line2 = `TRAMO ${pad3(s.zone + 1)} / −${depth.toLocaleString('es-ES')} M`;
    const tw = Math.max(ctx.measureText(line).width, ctx.measureText(line2).width);
    ctx.fillStyle = 'rgba(3,4,9,0.55)';
    ctx.fillRect(8, 8, tw + 18, u * 2.1);
    ctx.fillStyle = accent;
    ctx.fillRect(8, 8, 3, u * 2.1);
    ctx.fillStyle = rgba(accent, 0.95);
    this.text(line, 18, 8 + u * 0.85);
    ctx.fillStyle = 'rgba(215,222,234,0.9)';
    this.text(line2, 18, 8 + u * 1.75);
    // Placa de rango del día.
    const pl = PLACAS[placaIndex(s)];
    if (pl) this.icon(PLACA_SHEET, pl.ref, 8 + tw + 18 + u * 1.3, 8 + u * 1.75, u * 2.1);

    // Medidor vertical de profundidad (el tramo actual).
    const mx = w - 26;
    const top = 16;
    const bottom = hgt - 16;
    ctx.fillStyle = 'rgba(38,48,72,0.9)';
    ctx.fillRect(mx, top, 4, bottom - top);
    const frac = s.hero.x / L;
    const my = top + (bottom - top) * frac;
    ctx.fillStyle = rgba(accent, 0.35);
    ctx.fillRect(mx, top, 4, my - top);
    ctx.fillStyle = C.cyan;
    ctx.fillRect(mx - 6, my - 2, 16, 4);
    ctx.font = `${Math.round(u * 0.5)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillStyle = C.dim;
    this.text(`−${Math.round(depthAt(s.zone, 0)).toLocaleString('es-ES')}`, mx - 10, top + 8);
    this.text(`−${Math.round(depthAt(s.zone, 1)).toLocaleString('es-ES')}`, mx - 10, bottom);
    ctx.textAlign = 'left';

    // Barra ancha del Umbral, arriba en el centro.
    if (boss && boss.nombre) {
      const bw = Math.min(w * 0.42, 520);
      const bx = (w - bw) / 2;
      const by = u * 0.9;
      const col = boss.boss ? C.red : C.amber;
      ctx.fillStyle = 'rgba(3,4,9,0.7)';
      ctx.fillRect(bx - 4, by - u * 0.85, bw + 8, u * 1.5);
      ctx.fillStyle = col;
      ctx.font = `bold ${Math.round(u * 0.55)}px monospace`;
      ctx.textAlign = 'center';
      this.text(`☠ ${boss.nombre}`, w / 2, by - u * 0.2);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(60,10,20,0.9)';
      ctx.fillRect(bx, by, bw, u * 0.32);
      ctx.fillStyle = col;
      ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), u * 0.32);
    }
  }

  /** Carteles: nueva capa o sub-capa (grande, centrado) y avisos de Umbral (a la derecha). */
  private drawCards(w: number, hgt: number, u: number, ov: boolean, inset: number): void {
    const ctx = this.ctx;
    for (const c of this.fx.cards) {
      const age = c.max - c.life;
      const a = Math.min(1, age / 0.45, c.life / 0.7);
      if (a <= 0) continue;
      if (c.kind === 'era') {
        const x0 = ov ? inset + 16 : 0;
        const cw = w - x0;
        const cy = ov ? hgt * 0.5 : hgt * 0.42;
        const bandH = ov ? hgt * 0.78 : u * 5.2;
        const grad = ctx.createLinearGradient(x0, 0, x0 + cw, 0);
        grad.addColorStop(0, 'rgba(3,4,9,0)');
        grad.addColorStop(0.2, `rgba(3,4,9,${0.82 * a})`);
        grad.addColorStop(0.8, `rgba(3,4,9,${0.82 * a})`);
        grad.addColorStop(1, 'rgba(3,4,9,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x0, cy - bandH / 2, cw, bandH);
        // Líneas que se abren desde el centro.
        const open = Math.min(1, age / 0.8);
        ctx.fillStyle = rgba(c.color, 0.8 * a);
        const lw = cw * 0.5 * open;
        ctx.fillRect(x0 + cw / 2 - lw, cy - bandH / 2 + 2, lw * 2, 1.5);
        ctx.fillRect(x0 + cw / 2 - lw, cy + bandH / 2 - 3, lw * 2, 1.5);
        ctx.textAlign = 'center';
        ctx.globalAlpha = a;
        const k = ov ? Math.min(1, hgt / 110) : 1;
        ctx.fillStyle = c.color;
        ctx.font = `bold ${Math.round((ov ? 10 : u * 0.6) * k)}px monospace`;
        this.text(c.kicker.split('').join(ov ? '' : ' '), x0 + cw / 2, cy - (ov ? hgt * 0.17 : u * 1.25));
        ctx.fillStyle = '#eef3fb';
        ctx.font = `bold ${Math.round(ov ? Math.min(26, hgt * 0.24) : u * 1.55)}px monospace`;
        this.text(c.title, x0 + cw / 2, cy + (ov ? hgt * 0.08 : u * 0.45));
        if (c.line && (!ov || hgt >= 90)) {
          ctx.fillStyle = 'rgba(200,210,225,0.85)';
          ctx.font = `${Math.round(ov ? Math.min(12, hgt * 0.1) : u * 0.6)}px monospace`;
          this.text(c.line, x0 + cw / 2, cy + (ov ? hgt * 0.28 : u * 1.55));
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
      } else if (c.kind === 'aviso') {
        // Suceso: arriba a la derecha; en el panel, con su texto.
        const fs = ov ? Math.max(9, Math.min(13, hgt * 0.1)) : u * 0.55;
        ctx.font = `bold ${Math.round(fs * 1.2)}px monospace`;
        let tw = Math.max(ctx.measureText(c.title).width, fs * 8);
        const lines = !ov && c.line ? wrap(ctx, c.line, `${Math.round(fs * 0.85)}px monospace`, Math.max(tw, Math.min(w * 0.3, fs * 34)), 2) : [];
        if (lines.length) {
          ctx.font = `${Math.round(fs * 0.85)}px monospace`;
          for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
        }
        const isz = c.icon ? fs * 2.3 : 0;
        const ix = isz ? isz + fs * 0.5 : 0;
        const bw = tw + fs * 2 + ix;
        const bh = fs * 2.9 + lines.length * fs * 1.15;
        const drop = (1 - Math.min(1, age / 0.3)) * fs;
        const bx = w - bw - (ov ? 8 : 44);
        const by = (ov ? hgt * 0.06 : u * 1.9) - drop;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(3,4,9,0.85)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = c.color;
        ctx.fillRect(bx, by, 3, bh);
        if (c.icon) this.icon(c.icon.sheet, c.icon.ref, bx + fs * 0.6 + isz / 2, by + fs * 0.3 + isz, isz);
        ctx.font = `bold ${Math.round(fs * 0.8)}px monospace`;
        this.text(c.kicker, bx + fs + ix, by + fs * 1.05);
        ctx.fillStyle = '#eef3fb';
        ctx.font = `bold ${Math.round(fs * 1.2)}px monospace`;
        this.text(c.title, bx + fs + ix, by + fs * 2.35);
        ctx.fillStyle = 'rgba(200,210,225,0.85)';
        ctx.font = `${Math.round(fs * 0.85)}px monospace`;
        lines.forEach((l, i) => this.text(l, bx + fs + ix, by + fs * 3.45 + i * fs * 1.15));
        ctx.globalAlpha = 1;
      } else {
        // Aviso de Umbral: centrado arriba (el Umbral entra por la derecha y no se tapa).
        const fs = ov ? Math.max(10, Math.min(15, hgt * 0.12)) : u * 0.62;
        ctx.font = `bold ${Math.round(fs * 1.25)}px monospace`;
        const tw = Math.max(ctx.measureText(c.title).width, fs * 10);
        const isz = c.icon ? fs * 2.5 : 0;
        const ix = isz ? isz + fs * 0.5 : 0;
        const bw = tw + fs * 2 + ix;
        const x0 = ov ? inset : 0;
        const drop = (1 - Math.min(1, age / 0.3)) * fs;
        const bx = x0 + (w - x0 - bw) / 2;
        const by = (ov ? hgt * 0.06 : u * 1.9) - drop;
        const bh = fs * 3;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(3,4,9,0.85)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = c.color;
        ctx.fillRect(bx, by, 3, bh);
        if (c.icon) this.icon(c.icon.sheet, c.icon.ref, bx + fs * 0.6 + isz / 2, by + fs * 0.25 + isz, isz);
        ctx.font = `bold ${Math.round(fs * 0.8)}px monospace`;
        this.text(c.kicker, bx + fs + ix, by + fs * 1.05);
        ctx.fillStyle = '#eef3fb';
        ctx.font = `bold ${Math.round(fs * 1.25)}px monospace`;
        this.text(c.title, bx + fs + ix, by + fs * 2.45);
        ctx.globalAlpha = 1;
      }
    }
  }
}

/** Parte un texto en como mucho `max` líneas de ancho `maxW` (la última, con «…» si sobra). */
function wrap(ctx: CanvasRenderingContext2D, text: string, font: string, maxW: number, max: number): string[] {
  ctx.font = font;
  const out: string[] = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= maxW || !cur) cur = next;
    else {
      out.push(cur);
      cur = word;
      if (out.length === max) break;
    }
  }
  if (out.length < max && cur) out.push(cur);
  else if (out.length === max && cur && !out[max - 1].endsWith(cur)) out[max - 1] = out[max - 1].replace(/[\s,.;:]*$/, '…');
  return out;
}

const GLYPHS = '▒#¿%&0ʞ∆█';
/** Frontera de Ruido: letras que se corrompen y cambian a cada momento. */
function corrupt(s: string, tick: number, k: number): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    out += s[i] !== ' ' && hash(i * 1.7 + tick * 3.1) < k ? GLYPHS[Math.floor(hash(i + tick * 0.37) * GLYPHS.length)] : s[i];
  }
  return out;
}

