// Condiciones del día: 1 al azar por día; se anuncia en la pantalla "Nueva Jornada".
import type { Efectos } from '../core/mods';

export interface DayConditionDef {
  id: string;
  nombre: string;
  texto: string;
  peso: number;
  efectos?: Efectos;
  /** Los eventos de clima pesan ×N. */
  climaPeso?: number;
  /** Los mercaderes pesan ×N. */
  mercaderPeso?: number;
  /** El intervalo entre eventos se multiplica por N. */
  eventosIntervalo?: number;
  /** Duración y cantidades de los eventos ×N. */
  eventoMagnitud?: number;
  /** Híbridos entre corrientes desde la Era I. */
  hibridos?: boolean;
  /** Probabilidad de Mutaciones ×N. */
  mutacionMult?: number;
  /** Vida de los Umbrales ×N. */
  umbralVida?: number;
  /** Cartas por Encrucijada. */
  cartas?: number;
  /** Cada compañero llega con una copia débil (fracción de sus efectos). */
  gemelos?: number;
  /** Las Encrucijadas de Rumbo son todas ???. */
  sinMapa?: boolean;
  /** La Base celebra cada hora. */
  fiesta?: boolean;
  /** Cada Umbral derrotado reaparece 5 min como fantasma aliado. */
  ecoUmbral?: boolean;
}

export const DAY_CONDITIONS: DayConditionDef[] = [
  { id: 'normal', nombre: 'Día Normal', texto: 'Sin modificador. La Grieta, tal cual.', peso: 30 },
  { id: 'lluvia_larga', nombre: 'Día de Lluvia Larga', texto: 'Eventos de clima x2.', peso: 7, climaPeso: 2 },
  { id: 'mercaderes', nombre: 'Día de Mercaderes', texto: 'Los mercaderes aparecen el triple; las monedas valen menos.', peso: 6, mercaderPeso: 3, efectos: { oroMult: 0.85 } },
  { id: 'eco', nombre: 'Día del Eco', texto: 'Cada Umbral derrotado reaparece como fantasma aliado durante 5 min.', peso: 6, ecoUmbral: true },
  { id: 'silencioso', nombre: 'Día Silencioso', texto: 'Pocos eventos, pero cada uno es de rareza superior.', peso: 6, eventosIntervalo: 1.6, eventoMagnitud: 1.8 },
  { id: 'cruzadas', nombre: 'Día de Corrientes Cruzadas', texto: 'Desde la Era I aparecen criaturas híbridas entre corrientes.', peso: 7, hibridos: true },
  { id: 'pesado', nombre: 'Día Pesado', texto: 'La Presión sube el doble, igual que la probabilidad de Mutaciones.', peso: 6, efectos: { presionMult: 2 }, mutacionMult: 2 },
  { id: 'viento', nombre: 'Día de Viento Ascendente', texto: 'El héroe corre más rápido, pero los Umbrales tienen +30 % de vida.', peso: 6, efectos: { velocidadMult: 1.12 }, umbralVida: 1.3 },
  { id: 'generoso', nombre: 'Día Generoso', texto: 'Las Encrucijadas ofrecen 4 cartas en vez de 3.', peso: 6, cartas: 4 },
  { id: 'gemelos', nombre: 'Día de los Gemelos', texto: 'Cada compañero llega con una copia débil de sí mismo.', peso: 6, gemelos: 0.35 },
  { id: 'sin_mapa', nombre: 'Día Sin Mapa', texto: 'Las Encrucijadas de Rumbo son todas ???.', peso: 6, sinMapa: true },
  { id: 'fiesta', nombre: 'Día de la Fiesta Abajo', texto: 'La Base celebra cada hora: más producción y banderines.', peso: 6, fiesta: true, efectos: { produccionMult: 1.25 } },
];

export const CONDITION_BY_ID = Object.fromEntries(DAY_CONDITIONS.map((c) => [c.id, c]));
