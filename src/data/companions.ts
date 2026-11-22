// Encrucijada de Compañero. Cada uno tiene una misión personal que se cumple sola y lo evoluciona.
import type { Efectos } from '../core/mods';
import type { Oculto } from './origins';
import type { Rareza, Tag } from './tags';

export type Rol = 'Tanque' | 'Soporte' | 'Recolector' | 'Atacante';

export interface Mision {
  /** Qué se cuenta desde que el compañero se une. */
  tipo: 'bajas' | 'tramos' | 'moneda' | 'minutos';
  cantidad: number;
}

export interface CompanionDef {
  id: string;
  nombre: string;
  rol: Rol;
  etiquetas: [Tag, Tag];
  efectos: Efectos;
  texto: string;
  rareza: Rareza;
  mision: Mision;
  evolucion: { nombre: string; efectos: Efectos };
  oculto?: Oculto;
}

export const COMPANIONS: CompanionDef[] = [
  {
    id: 'grom', nombre: 'Grom, el Herrero Errante', rol: 'Tanque', etiquetas: ['Fuego', 'Mecánico'], rareza: 'Común',
    efectos: { defensaAdd: 20, ataqueMult: 1.05 }, texto: 'Absorbe golpes y remienda el equipo en marcha.',
    mision: { tipo: 'bajas', cantidad: 150 },
    evolucion: { nombre: 'Grom, Maestro de la Fragua Colgante', efectos: { defensaAdd: 40, ataqueMult: 1.15 } },
  },
  {
    id: 'lysa', nombre: 'Lysa, Sanadora del Alba', rol: 'Soporte', etiquetas: ['Sagrado', 'Marino'], rareza: 'Común',
    efectos: { regenMult: 1.6 }, texto: 'Cose heridas con hilo de luz.',
    mision: { tipo: 'minutos', cantidad: 40 },
    evolucion: { nombre: 'Lysa, Voz del Amanecer', efectos: { regenMult: 2, curaAlMatar: 0.08 } },
  },
  {
    id: 'pip', nombre: 'Pip, Ratero de Cornisa', rol: 'Recolector', etiquetas: ['Sombra', 'Bestia'], rareza: 'Rara',
    efectos: { oroMult: 1.4 }, texto: 'Encuentra moneda donde nadie miró.',
    mision: { tipo: 'moneda', cantidad: 800 },
    evolucion: { nombre: 'Pip, Príncipe de los Bolsillos', efectos: { oroMult: 1.7, dobleBotin: 0.1 } },
    oculto: { texto: 'Pip nunca tuvo los bolsillos vacíos.', efectos: { dobleBotin: 0.05 } },
  },
  {
    id: 'vesna', nombre: 'Vesna, Tiradora de Azotea', rol: 'Atacante', etiquetas: ['Mecánico', 'Sombra'], rareza: 'Común',
    efectos: { criticoAdd: 0.08 }, texto: 'Un disparo, un hueco en la niebla.',
    mision: { tipo: 'bajas', cantidad: 120 },
    evolucion: { nombre: 'Vesna, Ojo del Brocal', efectos: { criticoAdd: 0.15, danoCriticoAdd: 0.5 } },
  },
  {
    id: 'orun', nombre: 'Orun, Portador del Farol', rol: 'Soporte', etiquetas: ['Sagrado', 'Fuego'], rareza: 'Común',
    efectos: { vidaMult: 1.2 }, texto: 'Su farol no alumbra lejos, pero nunca se apaga.',
    mision: { tipo: 'tramos', cantidad: 12 },
    evolucion: { nombre: 'Orun, Llama que Baja', efectos: { vidaMult: 1.4, regenMult: 1.3 } },
  },
  {
    id: 'ilka', nombre: 'Ilka, Buceadora de Niebla', rol: 'Recolector', etiquetas: ['Marino', 'Hielo'], rareza: 'Común',
    efectos: { oroMult: 1.25, velocidadMult: 1.1 }, texto: 'Nada en la niebla como otros caminan.',
    mision: { tipo: 'tramos', cantidad: 10 },
    evolucion: { nombre: 'Ilka, Corriente Fría', efectos: { oroMult: 1.45, velocidadMult: 1.2 } },
  },
  {
    id: 'tarsis', nombre: 'Tarsis, Centinela Desertor', rol: 'Tanque', etiquetas: ['Cristal', 'Arcano'], rareza: 'Rara',
    efectos: { reflejo: 0.2, defensaAdd: 10 }, texto: 'Dejó su puesto. Conserva el escudo.',
    mision: { tipo: 'minutos', cantidad: 45 },
    evolucion: { nombre: 'Tarsis, Prisma Libre', efectos: { reflejo: 0.4, defensaAdd: 25 } },
  },
  {
    id: 'mu', nombre: 'Mu, la Jardinera Ciega', rol: 'Soporte', etiquetas: ['Veneno', 'Bestia'], rareza: 'Rara',
    efectos: { veneno: 0.3 }, texto: 'Conoce cada flor por lo que duele.',
    mision: { tipo: 'bajas', cantidad: 140 },
    evolucion: { nombre: 'Mu, Madre de Espinas', efectos: { veneno: 0.6, regenMult: 1.2 } },
  },
  {
    id: 'kestrel', nombre: 'Kestrel, Cartógrafa de Cables', rol: 'Recolector', etiquetas: ['Mecánico', 'Arcano'], rareza: 'Común',
    efectos: { velocidadMult: 1.2 }, texto: 'Sus mapas caducan cada noche. Los dibuja igual.',
    mision: { tipo: 'tramos', cantidad: 14 },
    evolucion: { nombre: 'Kestrel, la que Recuerda la Ruta', efectos: { velocidadMult: 1.35, oroMult: 1.15 } },
    oculto: { texto: 'En el reverso del mapa había un atajo.', efectos: { velocidadMult: 1.1 } },
  },
  {
    id: 'brasa', nombre: 'Brasa, Niño del Horno', rol: 'Atacante', etiquetas: ['Fuego', 'Veneno'], rareza: 'Común',
    efectos: { ataqueMult: 1.2 }, texto: 'Ríe poco. Quema mucho.',
    mision: { tipo: 'bajas', cantidad: 130 },
    evolucion: { nombre: 'Brasa, Corazón de Horno', efectos: { ataqueMult: 1.4 } },
  },
  {
    id: 'nix', nombre: 'Nix, Sombra Alquilada', rol: 'Atacante', etiquetas: ['Sombra', 'Hielo'], rareza: 'Épica',
    efectos: { danoCriticoAdd: 0.6 }, texto: 'Trabaja por contrato. El contrato eres tú.',
    mision: { tipo: 'moneda', cantidad: 1000 },
    evolucion: { nombre: 'Nix, Sombra Propia', efectos: { danoCriticoAdd: 1.2, criticoAdd: 0.05 } },
  },
  {
    id: 'odalis', nombre: 'Odalis, Marea Quieta', rol: 'Tanque', etiquetas: ['Marino', 'Cristal'], rareza: 'Común',
    efectos: { vidaMult: 1.3 }, texto: 'Nada la mueve. Todo la rodea.',
    mision: { tipo: 'minutos', cantidad: 35 },
    evolucion: { nombre: 'Odalis, Marea Alta', efectos: { vidaMult: 1.6 } },
  },
  {
    id: 'fenn', nombre: 'Fenn, Domador de Polillas', rol: 'Atacante', etiquetas: ['Bestia', 'Fuego'], rareza: 'Rara',
    efectos: { velAtaqueMult: 1.2 }, texto: 'Sus polillas van primero. Vuelven casi todas.',
    mision: { tipo: 'bajas', cantidad: 160 },
    evolucion: { nombre: 'Fenn, Señor del Enjambre Tibio', efectos: { velAtaqueMult: 1.4 } },
  },
  {
    id: 'hueso', nombre: 'Hueso, Monje del Eco', rol: 'Soporte', etiquetas: ['Sagrado', 'Arcano'], rareza: 'Épica',
    efectos: { curaAlMatar: 0.06, criticoAdd: 0.03 }, texto: 'Reza hacia abajo. A veces contestan.',
    mision: { tipo: 'tramos', cantidad: 15 },
    evolucion: { nombre: 'Hueso, el que Oyó Respuesta', efectos: { curaAlMatar: 0.12, criticoAdd: 0.06 } },
  },
  {
    id: 'sal', nombre: 'Sal, Recolectora de Escarcha', rol: 'Recolector', etiquetas: ['Hielo', 'Cristal'], rareza: 'Común',
    efectos: { oroMult: 1.2, lentitud: 0.1 }, texto: 'Raspa el frío de las paredes y lo vende.',
    mision: { tipo: 'moneda', cantidad: 700 },
    evolucion: { nombre: 'Sal, Dueña del Invierno Pequeño', efectos: { oroMult: 1.4, lentitud: 0.2 } },
  },
  {
    id: 'quill', nombre: 'Quill, Archivista Tóxico', rol: 'Tanque', etiquetas: ['Veneno', 'Hielo'], rareza: 'Legendaria',
    efectos: { defensaAdd: 15, lentitud: 0.15, veneno: 0.2 }, texto: 'Cataloga venenos. Los prueba en sí mismo.',
    mision: { tipo: 'minutos', cantidad: 50 },
    evolucion: { nombre: 'Quill, Índice Viviente', efectos: { defensaAdd: 30, lentitud: 0.25, veneno: 0.5 } },
  },
];

export const COMPANION_BY_ID = Object.fromEntries(COMPANIONS.map((c) => [c.id, c]));
