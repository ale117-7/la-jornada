import type { Efectos } from '../core/mods';

export const TAGS = ['Fuego', 'Hielo', 'Veneno', 'Sagrado', 'Sombra', 'Mecánico', 'Bestia', 'Arcano', 'Marino', 'Cristal'] as const;
export type Tag = (typeof TAGS)[number];

export type Corriente = 'N' | 'S' | 'A';
export const CORRIENTES: Record<Corriente, { nombre: string; moneda: string; color: string }> = {
  N: { nombre: 'Neón', moneda: 'Créditos', color: '#ff3fa4' },
  S: { nombre: 'Sintética', moneda: 'Datos', color: '#b6ff3f' },
  A: { nombre: 'Abismal', moneda: 'Esporas de luz', color: '#3fe0b0' },
};

export type Rareza = 'Común' | 'Rara' | 'Épica' | 'Legendaria';
/** Peso base por rareza al generar una Encrucijada (6.4). */
export const RAREZA_PESO: Record<Rareza, number> = { Común: 60, Rara: 28, Épica: 10, Legendaria: 2 };

/** En Horas Extra (Lo Hondo) las rarezas altas salen mucho más. */
export const RAREZA_PESO_EXTRA: Record<Rareza, number> = { Común: 35, Rara: 35, Épica: 22, Legendaria: 8 };

export interface SynergyLevel {
  /** Elementos de la build necesarios con la etiqueta. */
  n: 2 | 3 | 4;
  nombre: string;
  efectos: Efectos;
}

export interface SynergyDef {
  tag: Tag;
  color: string;
  /** 2: bono pasivo · 3: efecto visible nuevo · 4: transformación del héroe. Acumulativos. */
  niveles: [SynergyLevel, SynergyLevel, SynergyLevel];
}

export const SYNERGIES: SynergyDef[] = [
  {
    tag: 'Fuego',
    color: '#ff7a3f',
    niveles: [
      { n: 2, nombre: 'Rescoldo', efectos: { ataqueMult: 1.1 } },
      { n: 3, nombre: 'Combustión', efectos: { explosion: 0.3 } },
      { n: 4, nombre: 'Forma Ígnea', efectos: { ataqueMult: 1.5 } },
    ],
  },
  {
    tag: 'Hielo',
    color: '#9fd8ff',
    niveles: [
      { n: 2, nombre: 'Escarcha', efectos: { defensaAdd: 15 } },
      { n: 3, nombre: 'Aliento Helado', efectos: { lentitud: 0.25 } },
      { n: 4, nombre: 'Forma Glaciar', efectos: { vidaMult: 1.5 } },
    ],
  },
  {
    tag: 'Veneno',
    color: '#9be03f',
    niveles: [
      { n: 2, nombre: 'Savia Amarga', efectos: { velAtaqueMult: 1.08 } },
      { n: 3, nombre: 'Ponzoña', efectos: { veneno: 0.4 } },
      { n: 4, nombre: 'Forma Tóxica', efectos: { veneno: 1 } },
    ],
  },
  {
    tag: 'Sagrado',
    color: '#ffe9a3',
    niveles: [
      { n: 2, nombre: 'Vela Encendida', efectos: { regenMult: 1.3 } },
      { n: 3, nombre: 'Ofrenda', efectos: { curaAlMatar: 0.08 } },
      { n: 4, nombre: 'Forma Radiante', efectos: { vidaMult: 1.3, regenMult: 2 } },
    ],
  },
  {
    tag: 'Sombra',
    color: '#a07cff',
    niveles: [
      { n: 2, nombre: 'Paso Callado', efectos: { criticoAdd: 0.05 } },
      { n: 3, nombre: 'Manos Largas', efectos: { dobleBotin: 0.15 } },
      { n: 4, nombre: 'Forma Umbría', efectos: { criticoAdd: 0.15, danoCriticoAdd: 1 } },
    ],
  },
  {
    tag: 'Mecánico',
    color: '#ffb347',
    niveles: [
      { n: 2, nombre: 'Engranaje', efectos: { velAtaqueMult: 1.1 } },
      { n: 3, nombre: 'Martillo Hidráulico', efectos: { golpeFuerte: 3 } },
      { n: 4, nombre: 'Forma Cromada', efectos: { velAtaqueMult: 1.4 } },
    ],
  },
  {
    tag: 'Bestia',
    color: '#e0a03f',
    niveles: [
      { n: 2, nombre: 'Instinto', efectos: { vidaMult: 1.1 } },
      { n: 3, nombre: 'Estampida', efectos: { velocidadMult: 1.3 } },
      { n: 4, nombre: 'Forma Feral', efectos: { ataqueMult: 1.3, velAtaqueMult: 1.2 } },
    ],
  },
  {
    tag: 'Arcano',
    color: '#e03fe0',
    niveles: [
      { n: 2, nombre: 'Glifo', efectos: { danoCriticoAdd: 0.3 } },
      { n: 3, nombre: 'Descarga Arcana', efectos: { golpeFuerte: 2 } },
      { n: 4, nombre: 'Forma Arcana', efectos: { criticoAdd: 0.1, danoCriticoAdd: 1 } },
    ],
  },
  {
    tag: 'Marino',
    color: '#3f9be0',
    niveles: [
      { n: 2, nombre: 'Corriente', efectos: { oroMult: 1.1 } },
      { n: 3, nombre: 'Marea de Botín', efectos: { oroMult: 1.2, dobleBotin: 0.1 } },
      { n: 4, nombre: 'Forma Abisal', efectos: { regenMult: 2, oroMult: 1.3 } },
    ],
  },
  {
    tag: 'Cristal',
    color: '#7ff0f0',
    niveles: [
      { n: 2, nombre: 'Faceta', efectos: { defensaAdd: 10 } },
      { n: 3, nombre: 'Espejo', efectos: { reflejo: 0.3 } },
      { n: 4, nombre: 'Forma Prismática', efectos: { defensaAdd: 40, reflejo: 0.3 } },
    ],
  },
];

export const SYNERGY_BY_TAG = Object.fromEntries(SYNERGIES.map((s) => [s.tag, s])) as Record<Tag, SynergyDef>;
