// Mutaciones: efectos aleatorios sobre el Descensor, buenos o malos. La Presión alta las provoca.
import type { Efectos } from '../core/mods';

export interface MutationDef {
  id: string;
  nombre: string;
  buena: boolean;
  efectos: Efectos;
  texto: string;
  color: string;
}

const g = (id: string, nombre: string, efectos: Efectos, texto: string, color: string): MutationDef => ({ id, nombre, buena: true, efectos, texto, color });
const b = (id: string, nombre: string, efectos: Efectos, texto: string, color: string): MutationDef => ({ id, nombre, buena: false, efectos, texto, color });

export const MUTATIONS: MutationDef[] = [
  g('ojos_oscuridad', 'Ojos de Oscuridad', { criticoAdd: 0.08 }, 'Ven sin luz.', '#a07cff'),
  g('piel_corteza', 'Piel de Corteza', { defensaAdd: 20 }, 'Áspera, tibia, dura.', '#b5651d'),
  g('sangre_luminosa', 'Sangre Luminosa', { regenMult: 1.5 }, 'Brilla bajo la piel.', '#ffe9a3'),
  g('brazos_largos', 'Brazos Largos', { alcanceMult: 1.3 }, 'Llegan antes.', '#3fe0b0'),
  g('pulmon_doble', 'Pulmón Doble', { vidaMult: 1.2 }, 'Respira por dos.', '#3f9be0'),
  g('nervios_cable', 'Nervios de Cable', { velAtaqueMult: 1.15 }, 'Reaccionan antes de pensar.', '#ffb347'),
  g('huesos_huecos', 'Huesos Huecos', { velocidadMult: 1.15 }, 'Ligeros como los de un ave.', '#d7deea'),
  g('garras', 'Garras', { ataqueMult: 1.2 }, 'Crecieron en una noche.', '#ff4040'),
  g('glandula_veneno', 'Glándula de Veneno', { veneno: 0.3 }, 'Amarga en la garganta.', '#9be03f'),
  g('tercer_parpado', 'Tercer Párpado', { danoCriticoAdd: 0.4 }, 'Se cierra justo antes del golpe.', '#e03fe0'),
  g('piel_espejo', 'Piel de Espejo', { reflejo: 0.15 }, 'Devuelve lo que la toca.', '#7ff0f0'),
  g('estomago_moneda', 'Estómago de Moneda', { oroMult: 1.2 }, 'Digiere metal. Lo devuelve mejor.', '#ffd24a'),
  b('piel_cristal', 'Piel de Cristal', { defensaAdd: -15 }, 'Hermosa. Frágil.', '#b6f5ff'),
  b('sangre_espesa', 'Sangre Espesa', { regenMult: 0.7 }, 'Tarda en llegar.', '#a03f3f'),
  b('manos_temblorosas', 'Manos Temblorosas', { criticoAdd: -0.04 }, 'No se están quietas.', '#8a8f99'),
  b('pies_de_plomo', 'Pies de Plomo', { velocidadMult: 0.9 }, 'Cada paso pesa.', '#5c6b8a'),
  b('ojos_quemados', 'Ojos Quemados', { alcanceMult: 0.85 }, 'La luz de arriba ya molesta.', '#ff7a3f'),
  b('musculo_flojo', 'Músculo Flojo', { ataqueMult: 0.9 }, 'El brazo recuerda menos.', '#c9b27a'),
  b('corazon_lento', 'Corazón Lento', { velAtaqueMult: 0.92 }, 'Late cuando quiere.', '#6b4fa0'),
  b('piel_fina', 'Piel Fina', { vidaMult: 0.9 }, 'Se ve lo de dentro.', '#ff3fa4'),
];

export const MUTATION_BY_ID = Object.fromEntries(MUTATIONS.map((m) => [m.id, m]));
export const MUTATION_MAX = 8;
