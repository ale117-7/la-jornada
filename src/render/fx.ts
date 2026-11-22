// Efectos visuales efímeros: partículas, textos flotantes, anillos, destellos, temblor y
// carteles. No influyen en la simulación: se generan al comparar dos estados seguidos.
import { rgba } from './theme';

export interface Particle {
  /** Posición en el mundo (metros) o en pantalla (px) según `world`. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
  world: boolean;
  glow: boolean;
}

export interface FloatText {
  wx: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
}

export interface Ring {
  wx: number;
  y: number;
  r0: number;
  r1: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

export interface Card {
  kicker: string;
  title: string;
  line: string;
  color: string;
  life: number;
  max: number;
  /** 'era': cartel central grande · 'umbral': aviso arriba al centro · 'aviso': suceso, arriba a la derecha. */
  kind: 'era' | 'umbral' | 'aviso';
  /** Icono o retrato (hoja del atlas y cuadro). */
  icon?: { sheet: string; ref: [number | string, number] };
}

const MAX_PARTICLES = 180;
const MAX_TEXTS = 14;

/** Sprites de resplandor pre-dibujados (más baratos que shadowBlur). */
const glowCache = new Map<string, HTMLCanvasElement>();
export function glowSprite(color: string): HTMLCanvasElement {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, rgba(color, 0.9));
  grad.addColorStop(0.25, rgba(color, 0.45));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(color, c);
  return c;
}

/** Pseudo-aleatorio barato y local (los efectos no tocan el RNG de la simulación). */
let seed = 12345;
export function fxRand(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

export class Fx {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  rings: Ring[] = [];
  cards: Card[] = [];
  flash = { color: '#ffffff', life: 0, max: 1 };
  shake = { amp: 0, life: 0, max: 1 };
  /** Fundido rápido para tapar un salto de cámara (reaparecer, retirarse a farmear). */
  wipe = { life: 0, max: 1 };

  clear(): void {
    this.particles.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.cards.length = 0;
    this.flash.life = this.shake.life = this.wipe.life = 0;
  }

  burst(x: number, y: number, color: string, n: number, opts: { world?: boolean; speed?: number; size?: number; up?: number; grav?: number; glow?: boolean; life?: number } = {}): void {
    const room = MAX_PARTICLES - this.particles.length;
    for (let i = 0; i < Math.min(n, room); i++) {
      const a = fxRand() * Math.PI * 2;
      const sp = (opts.speed ?? 60) * (0.35 + fxRand() * 0.9);
      const life = (opts.life ?? 0.7) * (0.6 + fxRand() * 0.6);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.up ?? 30),
        life, max: life,
        size: (opts.size ?? 3) * (0.6 + fxRand() * 0.8),
        color,
        grav: opts.grav ?? 140,
        world: opts.world ?? true,
        glow: opts.glow ?? false,
      });
    }
  }

  text(wx: number, y: number, text: string, color: string, size: number, life = 1.1): void {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({ wx, y, text, color, life, max: life, size });
  }

  ring(wx: number, y: number, r0: number, r1: number, color: string, life = 0.45, width = 2): void {
    if (this.rings.length > 12) this.rings.shift();
    this.rings.push({ wx, y, r0, r1, life, max: life, color, width });
  }

  doFlash(color: string, life: number): void {
    this.flash = { color, life, max: life };
  }

  doShake(amp: number, life: number): void {
    if (amp >= this.shake.amp * (this.shake.life / this.shake.max)) this.shake = { amp, life, max: life };
  }

  card(c: Omit<Card, 'life'>): void {
    // Un cartel de era sustituye a cualquier otro; los avisos de Umbral no se apilan.
    this.cards = this.cards.filter((x) => x.kind !== c.kind);
    this.cards.push({ ...c, life: c.max });
  }

  /** Avanza `dt` segundos. Con dt = 0 (pausa) todo queda congelado. */
  update(dt: number): void {
    if (dt <= 0) return;
    const ps = this.particles;
    let w = 0;
    for (const p of ps) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += p.grav * dt;
      p.vx *= 1 - Math.min(1, dt * 1.5);
      p.x += (p.world ? p.vx / 14 : p.vx) * dt; // en el mundo, ~14 px por metro
      p.y += p.vy * dt;
      ps[w++] = p;
    }
    ps.length = w;
    this.texts = this.texts.filter((t) => (t.life -= dt) > 0);
    this.rings = this.rings.filter((r) => (r.life -= dt) > 0);
    this.cards = this.cards.filter((c) => (c.life -= dt) > 0);
    this.flash.life = Math.max(0, this.flash.life - dt);
    this.shake.life = Math.max(0, this.shake.life - dt);
    this.wipe.life = Math.max(0, this.wipe.life - dt);
  }

  shakeOffset(t: number): [number, number] {
    if (this.shake.life <= 0) return [0, 0];
    const k = this.shake.amp * (this.shake.life / this.shake.max);
    return [Math.sin(t * 0.091) * k, Math.cos(t * 0.077) * k * 0.6];
  }
}
