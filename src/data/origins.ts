// Encrucijada de Origen: cada carta combina un punto de entrada y un chasis de Descensor.
import type { Efectos } from '../core/mods';
import type { Corriente, Rareza, Tag } from './tags';

export interface Oculto {
  /** Texto que se revela al elegir la carta. */
  texto: string;
  efectos: Efectos;
}

export interface EntryPointDef {
  id: string;
  nombre: string;
  corriente: Corriente;
  /** Familias de criaturas iniciales: la 2.ª aparece a los 15 min. */
  familias: [string, string];
  etiquetas: Tag[];
  efectos: Efectos;
  texto: string;
  rareza: Rareza;
  oculto?: Oculto;
}

export interface ChassisDef {
  id: string;
  nombre: string;
  corriente: Corriente;
  spriteKey: string;
  etiquetas: Tag[];
  /** Habilidad del héroe. */
  habilidad: string;
  efectos: Efectos;
}

export const ENTRY_POINTS: EntryPointDef[] = [
  // Neón
  {
    id: 'muelle_9', nombre: 'Muelle 9, bajo la lluvia', corriente: 'N', familias: ['dron_sabueso', 'perro_chapa'],
    etiquetas: ['Mecánico'], efectos: { velAtaqueMult: 1.05 }, rareza: 'Común',
    texto: 'Grúas dormidas y charcos de aceite. Los drones aún patrullan.',
  },
  {
    id: 'mercado_negro', nombre: 'Mercado Negro del Brocal', corriente: 'N', familias: ['chatarrero', 'enjambre_cables'],
    etiquetas: ['Sombra'], efectos: { oroMult: 1.15 }, rareza: 'Rara',
    texto: 'Aquí todo tiene precio, incluso la bajada.',
    oculto: { texto: 'Alguien deslizó un cuchillo de más en tu bolsa.', efectos: { criticoAdd: 0.04 } },
  },
  {
    id: 'azotea_anuncios', nombre: 'Azotea de los Anuncios Rotos', corriente: 'N', familias: ['dron_sabueso', 'chatarrero'],
    etiquetas: ['Sombra', 'Mecánico'], efectos: { criticoAdd: 0.03 }, rareza: 'Épica',
    texto: 'Hologramas a medio morir iluminan el salto.',
  },
  // Sintética
  {
    id: 'estacion_cero', nombre: 'Estación de Medición Cero', corriente: 'S', familias: ['centinela_prisma', 'cuerpo_vacio'],
    etiquetas: ['Cristal'], efectos: { defensaAdd: 10 }, rareza: 'Común',
    texto: 'Instrumentos impecables que ya nadie lee.',
  },
  {
    id: 'escalera_servicio', nombre: 'Escalera de Servicio Infinita', corriente: 'S', familias: ['glitch_errante', 'constructo_luz'],
    etiquetas: ['Arcano'], efectos: { danoCriticoAdd: 0.3 }, rareza: 'Rara',
    texto: 'Los peldaños están numerados. Los números no terminan.',
  },
  {
    id: 'deposito_cuerpos', nombre: 'Depósito de Cuerpos de Repuesto', corriente: 'S', familias: ['cuerpo_vacio', 'constructo_luz'],
    etiquetas: ['Hielo'], efectos: { vidaMult: 1.1 }, rareza: 'Común',
    texto: 'Filas de cuerpos en frío, esperando un nombre.',
  },
  // Abismal
  {
    id: 'jardin_colgante', nombre: 'Jardín Colgante del Borde', corriente: 'A', familias: ['polilla_ceniza', 'lirio_dentado'],
    etiquetas: ['Bestia'], efectos: { regenMult: 1.3 }, rareza: 'Común',
    texto: 'Las flores miran hacia abajo, como todo aquí.',
  },
  {
    id: 'cascada_reves', nombre: 'Cascada que Cae al Revés', corriente: 'A', familias: ['garza_vacio', 'cangrejo_relicario'],
    etiquetas: ['Marino'], efectos: { oroMult: 1.1 }, rareza: 'Rara',
    texto: 'El agua sube. Lo que arrastra, brilla.',
  },
  {
    id: 'raiz_primer_arbol', nombre: 'Raíz del Primer Árbol', corriente: 'A', familias: ['lirio_dentado', 'garza_vacio'],
    etiquetas: ['Veneno', 'Sagrado'], efectos: { curaAlMatar: 0.03 }, rareza: 'Épica',
    texto: 'Una raíz tan vieja que la roca creció a su alrededor.',
  },
];

export const CHASSIS: ChassisDef[] = [
  {
    id: 'sabueso', nombre: 'Chasis Sabueso', corriente: 'N', spriteKey: 'hero', etiquetas: ['Mecánico'],
    habilidad: 'Dispara ráfagas a distancia.', efectos: { alcanceMult: 2, velAtaqueMult: 1.15 },
  },
  {
    id: 'ganzua', nombre: 'Chasis Ganzúa', corriente: 'N', spriteKey: 'hero', etiquetas: ['Sombra'],
    habilidad: 'Manos rápidas: a veces el botín sale doble.', efectos: { dobleBotin: 0.2 },
  },
  {
    id: 'monolito', nombre: 'Chasis Monolito', corriente: 'S', spriteKey: 'hero', etiquetas: ['Cristal'],
    habilidad: 'Tanque: aguanta y devuelve los golpes.', efectos: { vidaMult: 1.4, reflejo: 0.25 },
  },
  {
    id: 'eco', nombre: 'Chasis Eco', corriente: 'S', spriteKey: 'hero', etiquetas: ['Arcano'],
    habilidad: 'Acumula carga y la suelta en un golpe.', efectos: { golpeFuerte: 2 },
  },
  {
    id: 'raiz', nombre: 'Chasis Raíz', corriente: 'A', spriteKey: 'hero', etiquetas: ['Bestia'],
    habilidad: 'Se cura al matar.', efectos: { curaAlMatar: 0.15 },
  },
  {
    id: 'brasa', nombre: 'Chasis Brasa', corriente: 'A', spriteKey: 'hero', etiquetas: ['Fuego'],
    habilidad: 'Arde por dentro: pega más, aguanta menos.', efectos: { ataqueMult: 1.25, vidaMult: 0.9 },
  },
];

export const ENTRY_BY_ID = Object.fromEntries(ENTRY_POINTS.map((e) => [e.id, e]));
export const CHASSIS_BY_ID = Object.fromEntries(CHASSIS.map((c) => [c.id, c]));
