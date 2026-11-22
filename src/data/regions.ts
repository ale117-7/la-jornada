// Encrucijada de Rumbo: cada carta es una ruta concreta de descenso que fija la corriente.
import type { Efectos } from '../core/mods';
import type { Corriente, Rareza, Tag } from './tags';

export interface RegionDef {
  id: string;
  nombre: string;
  /** '?': corriente aleatoria, oculta hasta elegirla ("sin mapa"). */
  corriente: Corriente | '?';
  familias: [string, string];
  etiquetas: Tag[];
  efectos: Efectos;
  texto: string;
  rareza: Rareza;
}

export const REGIONS: RegionDef[] = [
  // Neón
  {
    id: 'cables_corporacion', nombre: 'Seguir los cables de la corporación', corriente: 'N', familias: ['dron_sabueso', 'enjambre_cables'],
    etiquetas: ['Mecánico'], efectos: { oroMult: 1.25 }, rareza: 'Común', texto: 'Donde hay cable, hay alguien cobrando.',
  },
  {
    id: 'mercado_lluvia', nombre: 'El mercado bajo la lluvia', corriente: 'N', familias: ['chatarrero', 'perro_chapa'],
    etiquetas: ['Sombra'], efectos: { dobleBotin: 0.1 }, rareza: 'Común', texto: 'Mercaderes sin licencia y perros sin dueño.',
  },
  {
    id: 'fabrica_gotea', nombre: 'La fábrica que gotea', corriente: 'N', familias: ['perro_chapa', 'enjambre_cables'],
    etiquetas: ['Fuego'], efectos: { ataqueMult: 1.15, criaturaAtkMult: 1.1 }, rareza: 'Rara', texto: 'Los hornos siguen encendidos. Nadie sabe para quién.',
  },
  {
    id: 'tunel_tren', nombre: 'El túnel del tren apagado', corriente: 'N', familias: ['dron_sabueso', 'chatarrero'],
    etiquetas: ['Hielo'], efectos: { velocidadMult: 1.25 }, rareza: 'Común', texto: 'Vías rectas hacia abajo. Hace frío y se avanza rápido.',
  },
  // Sintética
  {
    id: 'escotilla_sellada', nombre: 'Entrar por la escotilla sellada', corriente: 'S', familias: ['centinela_prisma', 'constructo_luz'],
    etiquetas: ['Cristal'], efectos: { criaturaVidaMult: 1.3, criaturaOroMult: 1.6 }, rareza: 'Rara', texto: 'Centinelas muy resistentes guardan algo que vale la pena.',
  },
  {
    id: 'pasillo_senaletica', nombre: 'El pasillo de señalética', corriente: 'S', familias: ['glitch_errante', 'cuerpo_vacio'],
    etiquetas: ['Arcano'], efectos: { criticoAdd: 0.06 }, rareza: 'Común', texto: 'Flechas enormes. Todas señalan el mismo punto débil.',
  },
  {
    id: 'sala_cuerpos', nombre: 'La sala de cuerpos en espera', corriente: 'S', familias: ['cuerpo_vacio', 'centinela_prisma'],
    etiquetas: ['Hielo'], efectos: { vidaMult: 1.2 }, rareza: 'Común', texto: 'Uno de los cuerpos es de tu talla.',
  },
  {
    id: 'ascensor_baja', nombre: 'El ascensor que solo baja', corriente: 'S', familias: ['constructo_luz', 'glitch_errante'],
    etiquetas: ['Mecánico'], efectos: { velocidadMult: 1.15, velAtaqueMult: 1.1 }, rareza: 'Épica', texto: 'No tiene botones. No los necesita.',
  },
  // Abismal
  {
    id: 'raices_arbol_madre', nombre: 'Bajar por las raíces del árbol madre', corriente: 'A', familias: ['polilla_ceniza', 'garza_vacio'],
    etiquetas: ['Bestia'], efectos: { criaturasExtra: 2, criaturaVidaMult: 0.8 }, rareza: 'Común', texto: 'Bestias que se multiplican entre las raíces.',
  },
  {
    id: 'estanque_suspendido', nombre: 'El estanque suspendido', corriente: 'A', familias: ['cangrejo_relicario', 'garza_vacio'],
    etiquetas: ['Marino'], efectos: { regenMult: 1.5 }, rareza: 'Común', texto: 'Agua quieta en mitad del aire. Cura lo que toca.',
  },
  {
    id: 'claro_lirios', nombre: 'El claro de los lirios', corriente: 'A', familias: ['lirio_dentado', 'polilla_ceniza'],
    etiquetas: ['Veneno'], efectos: { veneno: 0.25 }, rareza: 'Rara', texto: 'Hermoso. No respires hondo.',
  },
  {
    id: 'santuario_musgo', nombre: 'El santuario cubierto de musgo', corriente: 'A', familias: ['cangrejo_relicario', 'lirio_dentado'],
    etiquetas: ['Sagrado'], efectos: { curaAlMatar: 0.05, defensaAdd: 10 }, rareza: 'Épica', texto: 'Alguien rezó aquí antes de que hubiera abismo.',
  },
  // Sin mapa: al elegirla se revela una ruta al azar de las anteriores, con un extra.
  {
    id: 'sin_mapa', nombre: 'Saltar a la oscuridad sin mapa', corriente: '?', familias: ['dron_sabueso', 'perro_chapa'],
    etiquetas: [], efectos: { oroMult: 1.2 }, rareza: 'Rara', texto: 'Ninguna ruta. Solo la caída y lo que encuentre.',
  },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
