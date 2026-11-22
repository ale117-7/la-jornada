// Mascotas: nacen en el Criadero (Era III) y suben de nivel con Esencia.
import type { Efectos } from '../core/mods';

export interface PetDef {
  id: string;
  nombre: string;
  color: string;
  texto: string;
  /** Efecto por nivel. */
  efectos: Efectos;
}

export const PETS: PetDef[] = [
  { id: 'polilla_farol', nombre: 'Polilla Farol', color: '#ffe9a3', texto: 'Alumbra el punto débil.', efectos: { criticoAdd: 0.012 } },
  { id: 'rata_cable', nombre: 'Rata de Cable', color: '#ffb347', texto: 'Roba moneda de los bolsillos caídos.', efectos: { oroMult: 1.05 } },
  { id: 'cangrejito', nombre: 'Cangrejo de Bolsillo', color: '#3f9be0', texto: 'Se interpone. Aguanta.', efectos: { defensaAdd: 5, vidaMult: 1.03 } },
  { id: 'dron_colibri', nombre: 'Dron Colibrí', color: '#ff3fa4', texto: 'Pica al enemigo entre golpe y golpe.', efectos: { velAtaqueMult: 1.035 } },
  { id: 'brote', nombre: 'Brote Andante', color: '#9be03f', texto: 'Su savia cierra heridas.', efectos: { regenMult: 1.1 } },
  { id: 'chispa', nombre: 'Chispa Errante', color: '#ff7a3f', texto: 'Aviva cada golpe.', efectos: { ataqueMult: 1.05 } },
  { id: 'prisma_vivo', nombre: 'Prisma Vivo', color: '#7ff0f0', texto: 'Devuelve parte de lo que recibe.', efectos: { reflejo: 0.03 } },
  { id: 'sombra_mansa', nombre: 'Sombra Mansa', color: '#a07cff', texto: 'Señala dónde duele más.', efectos: { danoCriticoAdd: 0.08 } },
];

export const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));
export const PET_MAX_LEVEL = 10;
