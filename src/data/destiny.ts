// Cartas de Destino / Horas Extra: extrañas, de alto impacto o que rompen reglas (5:00 y cada 60–90 min).
import type { Efectos } from '../core/mods';
import { artefacto, elite, varios, type Efx } from './efx';
import type { Rareza, Tag } from './tags';

export interface DestinyDef {
  id: string;
  nombre: string;
  /** Subtipo para que las cartas sean distintas entre sí. */
  clase: 'Poder' | 'Riesgo' | 'Riqueza' | 'Rareza';
  etiquetas: Tag[];
  /** Modificadores permanentes del día. */
  efectos?: Efectos;
  /** Suceso inmediato al elegirla. */
  efx?: Efx;
  /** El mundo se dibuja espejado. */
  espejo?: boolean;
  texto: string;
  rareza: Rareza;
}

export const DESTINIES: DestinyDef[] = [
  { id: 'portal_reves', nombre: 'Portal al Revés', clase: 'Rareza', etiquetas: ['Arcano'], espejo: true, efectos: { criaturaOroMult: 1.6, criaturaAtkMult: 1.2 }, rareza: 'Rara', texto: 'El héroe corre hacia la izquierda. Todo lo demás es su reflejo.' },
  { id: 'coloso_dormido', nombre: 'El Coloso Dormido', clase: 'Riesgo', etiquetas: ['Bestia'], efx: elite('El Coloso Dormido', 400, 5, varios({ t: 'moneda', id: 'fragmentos', n: 60 }, artefacto(4))), rareza: 'Épica', texto: 'Despierta algo que tardará una hora en caer.' },
  { id: 'segunda_base', nombre: 'Segunda Base', clase: 'Riqueza', etiquetas: ['Mecánico'], efectos: { produccionMult: 2 }, rareza: 'Rara', texto: 'Un clon de la Base baja a tu lado, con otra especialidad.' },
  { id: 'hora_prestada', nombre: 'La Hora Prestada', clase: 'Riesgo', etiquetas: ['Hielo'], efectos: { velocidadMult: 1.6, criaturaVidaMult: 1.3 }, rareza: 'Común', texto: 'Corres con el tiempo de otro. Habrá que devolverlo.' },
  { id: 'corazon_vacio', nombre: 'Corazón de Vacío', clase: 'Poder', etiquetas: ['Sombra'], efectos: { ataqueMult: 3, vidaMult: 0.5 }, rareza: 'Rara', texto: 'Nada dentro. Todo hacia fuera.' },
  { id: 'peso_mundo', nombre: 'El Peso del Mundo', clase: 'Poder', etiquetas: ['Cristal'], efectos: { vidaMult: 3, velocidadMult: 0.8 }, rareza: 'Común', texto: 'Cargas con la capa de arriba. Nada te tumba; todo te frena.' },
  { id: 'lluvia_monedas', nombre: 'Lluvia de Monedas', clase: 'Riqueza', etiquetas: ['Marino'], efectos: { oroMult: 4, costeMejorasMult: 1.6 }, rareza: 'Común', texto: 'Llueve metal. Los precios se enteran.' },
  { id: 'enjambre_infinito', nombre: 'El Enjambre Infinito', clase: 'Riesgo', etiquetas: ['Veneno'], efectos: { criaturasExtra: 6, criaturaVidaMult: 0.6, criaturaOroMult: 0.8 }, rareza: 'Rara', texto: 'No se acaban. Tampoco pesan.' },
  { id: 'espejo_roto', nombre: 'Espejo Roto', clase: 'Rareza', etiquetas: ['Cristal'], efectos: { reflejo: 1, defensaAdd: -40 }, rareza: 'Épica', texto: 'Todo golpe vuelve entero. También entra entero.' },
  { id: 'mutacion_total', nombre: 'Mutación Total', clase: 'Rareza', etiquetas: ['Bestia'], efx: varios({ t: 'mutacion' }, { t: 'mutacion' }, { t: 'mutacion', buena: true }), rareza: 'Rara', texto: 'El cuerpo decide por sí mismo. Tres veces.' },
  { id: 'museo_caido', nombre: 'El Museo Caído', clase: 'Riqueza', etiquetas: ['Arcano'], efx: varios(artefacto(3), artefacto(3)), rareza: 'Épica', texto: 'Una sala entera de vitrinas, intacta, en mitad de la caída.' },
  { id: 'pulso_fondo', nombre: 'Pulso del Fondo', clase: 'Poder', etiquetas: ['Mecánico'], efectos: { golpeFuerte: 5, velAtaqueMult: 0.85 }, rareza: 'Rara', texto: 'Golpeas al compás de algo enorme.' },
  { id: 'sangre_neon', nombre: 'Sangre de Neón', clase: 'Poder', etiquetas: ['Fuego'], efectos: { criticoAdd: 0.25, danoCriticoAdd: 1.5, regenMult: 0.5 }, rareza: 'Legendaria', texto: 'Brilla por las venas. Quema al curar.' },
  { id: 'eco_de_todos', nombre: 'El Eco de Todos', clase: 'Rareza', etiquetas: ['Sagrado'], efectos: { curaAlMatar: 0.15, ecosMult: 2 }, rareza: 'Épica', texto: 'Cada Descensor caído empuja un poco.' },
];

export const DESTINY_BY_ID = Object.fromEntries(DESTINIES.map((d) => [d.id, d]));
