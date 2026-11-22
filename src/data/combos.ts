// Combos secretos entre dos etiquetas concretas. No se anuncian: se descubren (y quedan en la Crónica).
import type { Efectos } from '../core/mods';
import type { Tag } from './tags';

export interface ComboDef {
  id: string;
  nombre: string;
  tags: [Tag, Tag];
  efectos: Efectos;
}

export const COMBOS: ComboDef[] = [
  { id: 'vapor', nombre: 'Vapor', tags: ['Hielo', 'Fuego'], efectos: { lentitud: 0.15, veneno: 0.2 } },
  { id: 'penumbra', nombre: 'Penumbra', tags: ['Sombra', 'Sagrado'], efectos: { criticoAdd: 0.08, curaAlMatar: 0.04 } },
  { id: 'jauria_hierro', nombre: 'Jauría de Hierro', tags: ['Mecánico', 'Bestia'], efectos: { velAtaqueMult: 1.15 } },
  { id: 'lente_arcana', nombre: 'Lente Arcana', tags: ['Arcano', 'Cristal'], efectos: { danoCriticoAdd: 0.6 } },
  { id: 'marea_roja', nombre: 'Marea Roja', tags: ['Marino', 'Veneno'], efectos: { veneno: 0.5 } },
  { id: 'forja_viva', nombre: 'Forja Viva', tags: ['Fuego', 'Mecánico'], efectos: { ataqueMult: 1.2 } },
  { id: 'permafrost', nombre: 'Permafrost', tags: ['Hielo', 'Cristal'], efectos: { defensaAdd: 30 } },
  { id: 'colmillo', nombre: 'Colmillo', tags: ['Bestia', 'Veneno'], efectos: { golpeFuerte: 1.5 } },
  { id: 'agua_bendita', nombre: 'Agua Bendita', tags: ['Sagrado', 'Marino'], efectos: { regenMult: 1.8 } },
  { id: 'eco_negro', nombre: 'Eco Negro', tags: ['Sombra', 'Arcano'], efectos: { dobleBotin: 0.15 } },
  { id: 'pira', nombre: 'Pira', tags: ['Fuego', 'Sagrado'], efectos: { explosion: 0.25 } },
  { id: 'relojeria', nombre: 'Relojería', tags: ['Mecánico', 'Cristal'], efectos: { velAtaqueMult: 1.1, criticoAdd: 0.05 } },
];

export const COMBO_BY_ID = Object.fromEntries(COMBOS.map((c) => [c.id, c]));
/** Un combo se activa con ambas etiquetas presentes y al menos estos elementos entre las dos. */
export const COMBO_MIN_ELEMENTOS = 3;
