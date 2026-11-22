// Efectos de sucesos (eventos, cadenas, hitos, cartas): primitivas de datos que interpreta core/world.ts.
import type { Efectos } from '../core/mods';
import type { CurrencyId } from './currencies';

export type Efx =
  /** Modificadores temporales durante `min` minutos trabajados. */
  | { t: 'buff'; min: number; efectos: Efectos; visual?: Visual }
  /** Moneda de la corriente: k × lo que suelta una criatura del tramo (negativo: se pierde). */
  | { t: 'oro'; k: number }
  | { t: 'moneda'; id: CurrencyId; n: number }
  /** Avanza tramos de golpe (nunca se salta un Umbral). */
  | { t: 'tramos'; n: number }
  /** Artefacto (reliquia) al azar; gradoMin 1 = Común … 4 = Legendario. */
  | { t: 'artefacto'; gradoMin?: number }
  | { t: 'mutacion'; buena?: boolean }
  | { t: 'mascota' }
  /** Criatura especial en el tramo actual (mini-jefe, jefe errante…). hp/atk: múltiplos de una criatura normal. */
  | { t: 'elite'; nombre: string; hp: number; atk: number; premio?: Efx }
  /** El héroe queda bloqueado estos segundos. */
  | { t: 'pausa'; seg: number }
  /** Modificadores para el resto del día. */
  | { t: 'permanente'; efectos: Efectos }
  | { t: 'azar'; p: number; a: Efx; b: Efx }
  | { t: 'varios'; lista: Efx[] }
  | { t: 'despues'; min: number; efecto: Efx; texto?: string }
  | { t: 'flag'; id: 'revelaOculto' | 'cuatroCartas' | 'anuncioTemprano' | 'presagio' }
  /** Revela o descubre un combo secreto de sinergia. */
  | { t: 'combo' }
  /** Avanza una cadena si está activa hoy. */
  | { t: 'cadena'; id: string; si_no?: Efx }
  /** Un compañero evoluciona. */
  | { t: 'evolucionar' }
  /** Fragmento de lore en el registro. */
  | { t: 'lore' }
  | { t: 'nada' };

/** Pista visual para el render (placeholder; el arte final llegará después). */
export type Visual = 'oscuro' | 'lluvia' | 'niebla' | 'brillo' | 'lento' | 'glitch' | 'espejo' | 'sangre';

export const buff = (min: number, efectos: Efectos, visual?: Visual): Efx => ({ t: 'buff', min, efectos, visual });
export const oro = (k: number): Efx => ({ t: 'oro', k });
export const varios = (...lista: Efx[]): Efx => ({ t: 'varios', lista });
export const azar = (p: number, a: Efx, b: Efx): Efx => ({ t: 'azar', p, a, b });
export const perm = (efectos: Efectos): Efx => ({ t: 'permanente', efectos });
export const despues = (min: number, efecto: Efx, texto?: string): Efx => ({ t: 'despues', min, efecto, texto });
export const elite = (nombre: string, hp: number, atk: number, premio?: Efx): Efx => ({ t: 'elite', nombre, hp, atk, premio });
export const artefacto = (gradoMin = 1): Efx => ({ t: 'artefacto', gradoMin });
export const tramos = (n: number): Efx => ({ t: 'tramos', n });
export const NADA: Efx = { t: 'nada' };
