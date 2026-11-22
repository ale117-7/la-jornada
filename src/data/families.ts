import type { Corriente, Tag } from './tags';

export interface FamilyDef {
  id: string;
  nombre: string;
  corriente: Corriente;
  etiqueta: Tag;
  spriteKey: string;
  /** Forma placeholder cuando no hay sprite propio. */
  forma: 'triangulo' | 'cuadrado' | 'rombo' | 'circulo' | 'cruz';
  vuela: boolean;
  hpMult: number;
  atkMult: number;
  goldMult: number;
  atkIntervalMs: number;
  /** Alcance de ataque en metros (máx. 55: lo exige la separación entre criaturas). */
  range: number;
  peso: number;
  /** Nombre femenino (para concordar los modificadores). */
  fem: boolean;
  /** Partes del nombre, para generar híbridos: «Polilla» + «de Chapa». */
  nucleo: string;
  apellido: string;
}

const f = (
  id: string,
  nombre: string,
  corriente: Corriente,
  etiqueta: Tag,
  forma: FamilyDef['forma'],
  vuela: boolean,
  hpMult: number,
  atkMult: number,
  goldMult: number,
  atkIntervalMs: number,
  range: number,
  fem: boolean,
  nucleo: string,
  apellido: string,
): FamilyDef => ({ id, nombre, corriente, etiqueta, spriteKey: id, forma, vuela, hpMult, atkMult, goldMult, atkIntervalMs, range, peso: 1, fem, nucleo, apellido });

// 4 familias por corriente. El punto de entrada (Origen) y el Rumbo deciden qué par aparece.
export const FAMILIES: FamilyDef[] = [
  // Neón
  f('dron_sabueso', 'Dron Sabueso', 'N', 'Mecánico', 'triangulo', true, 0.8, 0.8, 1, 1200, 55, false, 'Dron', 'Sabueso'),
  f('chatarrero', 'Chatarrero Aumentado', 'N', 'Sombra', 'cuadrado', false, 1.3, 1.0, 1.4, 1000, 16, false, 'Chatarrero', 'Aumentado'),
  f('enjambre_cables', 'Enjambre de Cables', 'N', 'Mecánico', 'cruz', true, 0.6, 0.6, 0.8, 500, 16, false, 'Enjambre', 'de Cables'),
  f('perro_chapa', 'Perro de Chapa', 'N', 'Mecánico', 'cuadrado', false, 1.6, 1.2, 1.8, 800, 16, false, 'Perro', 'de Chapa'),
  // Sintética
  f('centinela_prisma', 'Centinela Prisma', 'S', 'Cristal', 'rombo', false, 1.8, 0.9, 1.7, 1300, 16, false, 'Centinela', 'Prisma'),
  f('cuerpo_vacio', 'Cuerpo Vacío', 'S', 'Arcano', 'cuadrado', false, 1.2, 1.1, 1.3, 1000, 16, false, 'Cuerpo', 'Vacío'),
  f('glitch_errante', 'Glitch Errante', 'S', 'Arcano', 'cruz', true, 0.7, 1.1, 1.1, 900, 40, false, 'Glitch', 'Errante'),
  f('constructo_luz', 'Constructo de Luz', 'S', 'Cristal', 'triangulo', true, 1.0, 0.85, 1.2, 1100, 55, false, 'Constructo', 'de Luz'),
  // Abismal
  f('polilla_ceniza', 'Polilla de Ceniza', 'A', 'Bestia', 'triangulo', true, 0.7, 0.7, 0.9, 700, 30, true, 'Polilla', 'de Ceniza'),
  f('lirio_dentado', 'Lirio Dentado', 'A', 'Veneno', 'circulo', false, 1.5, 1.3, 1.6, 1100, 16, false, 'Lirio', 'Dentado'),
  f('garza_vacio', 'Garza del Vacío', 'A', 'Bestia', 'rombo', true, 1.1, 1.2, 1.4, 1200, 55, true, 'Garza', 'del Vacío'),
  f('cangrejo_relicario', 'Cangrejo Relicario', 'A', 'Marino', 'circulo', false, 2.0, 0.8, 2.0, 1400, 16, false, 'Cangrejo', 'Relicario'),
];

export const FAMILY_BY_ID: Record<string, FamilyDef> = Object.fromEntries(FAMILIES.map((x) => [x.id, x]));
