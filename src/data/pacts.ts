// Encrucijada de Pacto: una regla poderosa con coste que cambia cómo funciona la partida.
import type { Efectos } from '../core/mods';
import type { Rareza, Tag } from './tags';

export interface PactDef {
  id: string;
  nombre: string;
  /** Subtipo para que las 3 cartas sean distintas entre sí. */
  clase: 'Ofensivo' | 'Defensivo' | 'Economía' | 'Extraño';
  etiquetas: Tag[];
  beneficio: Efectos;
  coste: Efectos;
  texto: string;
  rareza: Rareza;
}

export const PACTS: PactDef[] = [
  {
    id: 'sangre', nombre: 'Pacto de Sangre', clase: 'Ofensivo', etiquetas: ['Fuego'], rareza: 'Común',
    beneficio: { ataqueMult: 2 }, coste: { produccionMult: 0.7 }, texto: 'La Base paga lo que tu filo gana.',
  },
  {
    id: 'mercader', nombre: 'Pacto del Mercader', clase: 'Economía', etiquetas: ['Sombra'], rareza: 'Común',
    beneficio: { oroMult: 2 }, coste: { umbralBotinMult: 0 }, texto: 'Todo se vende mejor. Los Umbrales ya no sueltan nada.',
  },
  {
    id: 'enjambre', nombre: 'Pacto del Enjambre', clase: 'Extraño', etiquetas: ['Bestia'], rareza: 'Rara',
    beneficio: { criaturasExtra: 8, criaturaVidaMult: 0.4 }, coste: { criaturaOroMult: 0.6 }, texto: 'El triple de criaturas, cada una más frágil y más pobre.',
  },
  {
    id: 'cristal', nombre: 'Pacto de Cristal', clase: 'Defensivo', etiquetas: ['Cristal'], rareza: 'Rara',
    beneficio: { reflejo: 0.6, defensaAdd: 50 }, coste: { vidaMult: 0.55 }, texto: 'Piel de espejo: devuelve casi todo, aguanta casi nada.',
  },
  {
    id: 'avaro', nombre: 'Pacto del Avaro', clase: 'Economía', etiquetas: ['Marino'], rareza: 'Común',
    beneficio: { oroMult: 2.5 }, coste: { costeMejorasMult: 1.5 }, texto: 'Monedas a manos llenas. Cada mejora cuesta más soltarla.',
  },
  {
    id: 'relampago', nombre: 'Pacto del Relámpago', clase: 'Ofensivo', etiquetas: ['Mecánico'], rareza: 'Rara',
    beneficio: { velAtaqueMult: 2 }, coste: { vidaMult: 0.6 }, texto: 'Golpes como lluvia. Un cuerpo que apenas los resiste.',
  },
  {
    id: 'prisa', nombre: 'Pacto de la Prisa', clase: 'Extraño', etiquetas: ['Hielo'], rareza: 'Común',
    beneficio: { velocidadMult: 1.5 }, coste: { criaturaAtkMult: 1.3 }, texto: 'Bajas más rápido de lo prudente. Lo de abajo lo nota.',
  },
  {
    id: 'ayuno', nombre: 'Pacto del Ayuno', clase: 'Defensivo', etiquetas: ['Sagrado'], rareza: 'Épica',
    beneficio: { curaAlMatar: 0.2, defensaAdd: 20 }, coste: { regenMult: 0 }, texto: 'Ya no sanas solo: cada baja es tu alimento.',
  },
  {
    id: 'constructor', nombre: 'Pacto del Constructor', clase: 'Economía', etiquetas: ['Mecánico'], rareza: 'Rara',
    beneficio: { produccionMult: 2 }, coste: { ataqueMult: 0.75 }, texto: 'La Base lo es todo. Tú solo abres camino.',
  },
  {
    id: 'ceniza', nombre: 'Pacto de Ceniza', clase: 'Ofensivo', etiquetas: ['Fuego'], rareza: 'Épica',
    beneficio: { explosion: 0.6 }, coste: { criaturaVidaMult: 1.25 }, texto: 'Todo lo que muere estalla. Todo lo que vive, resiste más.',
  },
  {
    id: 'eco', nombre: 'Pacto del Eco', clase: 'Economía', etiquetas: ['Arcano'], rareza: 'Rara',
    beneficio: { ecosMult: 2 }, coste: { criaturaAtkMult: 1.2 }, texto: 'La Necrópolis te habla más alto. También sus guardianes.',
  },
  {
    id: 'hondura', nombre: 'Pacto de la Hondura', clase: 'Extraño', etiquetas: ['Marino'], rareza: 'Épica',
    beneficio: { presionInvertida: 1 }, coste: { presionAdd: 15 }, texto: 'Lo que aplasta a otros, a ti te afila.',
  },
  {
    id: 'veneno_lento', nombre: 'Pacto del Veneno Lento', clase: 'Extraño', etiquetas: ['Veneno'], rareza: 'Legendaria',
    beneficio: { veneno: 1.2 }, coste: { velAtaqueMult: 0.7 }, texto: 'Un solo golpe basta, si sabes esperar.',
  },
];

export const PACT_BY_ID = Object.fromEntries(PACTS.map((p) => [p.id, p]));
