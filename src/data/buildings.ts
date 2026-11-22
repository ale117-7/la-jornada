// La Base Colgante: empieza como un montacargas y crece sola con Materiales.
// Cada edificio da producción pasiva, un efecto por nivel o desbloquea una mecánica.
import type { Efectos } from '../core/mods';
import type { CurrencyId } from './currencies';
import type { Tag } from './tags';

export type EquipSlot = 'arma' | 'armadura' | 'accesorio';

export interface BuildingDef {
  id: string;
  nombre: string;
  /** Era (1-based) desde la que la IA puede construirlo. */
  era: number;
  /** Coste en Materiales del nivel 1; cada nivel cuesta ×COST_GROWTH. */
  coste: number;
  maxNivel: number;
  /** Peso en la lista de prioridades de la IA (se multiplica si la build comparte la etiqueta). */
  prioridad: number;
  etiqueta?: Tag;
  texto: string;
  /** Efecto por nivel (los multiplicadores se elevan al nivel; los aditivos se multiplican). */
  efectos?: Efectos;
  /** Producción pasiva por minuto y nivel. 'oro' escala con la moneda del tramo actual. */
  produce?: { moneda: CurrencyId | 'oro'; porMin: number };
  /** Oficio: taller que fabrica equipo de una ranura. */
  oficio?: { nombre: string; slot: EquipSlot };
  especial?: 'mascotas' | 'bendiciones';
}

export const BUILDING_COST_GROWTH = 1.55;

export const BUILDINGS: BuildingDef[] = [
  // Era I — nace la Base (gratis, a los 45 min)
  { id: 'montacargas', nombre: 'Montacargas', era: 1, coste: 30, maxNivel: 10, prioridad: 1.2, texto: 'Baja detrás del Descensor y recoge lo que deja.', produce: { moneda: 'oro', porMin: 0.15 } },
  // Era II — módulos automáticos
  { id: 'almacen', nombre: 'Almacén de Chatarra', era: 2, coste: 15, maxNivel: 10, prioridad: 3, etiqueta: 'Mecánico', texto: 'Clasifica chatarra en Materiales.', produce: { moneda: 'materiales', porMin: 6 } },
  { id: 'generador', nombre: 'Generador de Cable', era: 2, coste: 40, maxNivel: 8, prioridad: 1.6, etiqueta: 'Mecánico', texto: 'Toda la Base produce más.', efectos: { produccionMult: 1.12 } },
  { id: 'barracon', nombre: 'Barracón Colgante', era: 2, coste: 30, maxNivel: 10, prioridad: 2, etiqueta: 'Bestia', texto: 'El grupo descansa y pega más fuerte.', efectos: { ataqueMult: 1.09 } },
  { id: 'enfermeria', nombre: 'Enfermería de Lona', era: 2, coste: 30, maxNivel: 10, prioridad: 2, etiqueta: 'Sagrado', texto: 'Vendas, sueros y una cama que no se balancea.', efectos: { vidaMult: 1.09, regenMult: 1.04 } },
  { id: 'mercado', nombre: 'Mercado de la Pasarela', era: 2, coste: 45, maxNivel: 8, prioridad: 1.3, etiqueta: 'Sombra', texto: 'Trueque entre cables: más moneda por cada baja.', efectos: { oroMult: 1.08 } },
  { id: 'camara', nombre: 'Cámara de Descompresión', era: 2, coste: 50, maxNivel: 6, prioridad: 1.5, etiqueta: 'Hielo', texto: 'Una hora dentro y el cuerpo olvida la hondura.', efectos: { presionAdd: -5 } },
  // Era III — talleres (oficios), mascotas y esencia
  { id: 'fragua', nombre: 'Fragua Suspendida', era: 3, coste: 80, maxNivel: 10, prioridad: 2.4, etiqueta: 'Fuego', texto: 'Oficio de Herrero: forja armas.', oficio: { nombre: 'Herrero', slot: 'arma' } },
  { id: 'taller_placas', nombre: 'Taller de Placas', era: 3, coste: 80, maxNivel: 10, prioridad: 2.2, etiqueta: 'Cristal', texto: 'Oficio de Blindador: monta armaduras.', oficio: { nombre: 'Blindador', slot: 'armadura' } },
  { id: 'taller_lentes', nombre: 'Taller de Lentes', era: 3, coste: 90, maxNivel: 10, prioridad: 1.8, etiqueta: 'Arcano', texto: 'Oficio de Óptico: pule accesorios de precisión.', oficio: { nombre: 'Óptico', slot: 'accesorio' } },
  { id: 'destileria', nombre: 'Destilería de Esencia', era: 3, coste: 70, maxNivel: 10, prioridad: 2.6, etiqueta: 'Veneno', texto: 'Destila Esencia de lo que gotea de la pared.', produce: { moneda: 'esencia', porMin: 1.6 } },
  { id: 'criadero', nombre: 'Criadero de Nidos', era: 3, coste: 100, maxNivel: 9, prioridad: 2, etiqueta: 'Bestia', texto: 'Nacen mascotas. Más niveles, más nidos.', especial: 'mascotas' },
  { id: 'taberna', nombre: 'Taberna del Último Peldaño', era: 3, coste: 110, maxNivel: 8, prioridad: 1.4, etiqueta: 'Marino', texto: 'Historias y caldo: el grupo ataca más rápido.', efectos: { velAtaqueMult: 1.05 } },
  // Era IV — la Necrópolis
  { id: 'santuario', nombre: 'Santuario del Cable', era: 4, coste: 200, maxNivel: 6, prioridad: 2, etiqueta: 'Sagrado', texto: 'Cada cierto tiempo concede una bendición al azar.', especial: 'bendiciones', efectos: { presionAdd: -2 } },
  { id: 'osario', nombre: 'Osario de Ecos', era: 4, coste: 180, maxNivel: 10, prioridad: 2.6, etiqueta: 'Sombra', texto: 'Escucha la ciudad hundida y guarda sus Ecos.', produce: { moneda: 'ecos', porMin: 0.8 } },
  { id: 'torre_vigia', nombre: 'Torre de Vigía', era: 4, coste: 220, maxNivel: 8, prioridad: 1.5, etiqueta: 'Hielo', texto: 'Ve venir los golpes: más defensa y crítico.', efectos: { defensaAdd: 8, criticoAdd: 0.01 } },
  { id: 'biblioteca', nombre: 'Biblioteca Colgante', era: 4, coste: 240, maxNivel: 8, prioridad: 1.4, etiqueta: 'Arcano', texto: 'Catálogos de lo hallado: más botín doble.', efectos: { dobleBotin: 0.03 } },
  // Era V — Lo Hondo
  { id: 'sonda', nombre: 'Sonda del Vacío', era: 5, coste: 600, maxNivel: 10, prioridad: 3, etiqueta: 'Cristal', texto: 'Baja sola hacia lo oscuro y vuelve con Fragmentos.', produce: { moneda: 'fragmentos', porMin: 0.5 } },
  // Obras largas de Lo Hondo: dan salida a los Materiales cuando el resto de la Base llega a su tope.
  { id: 'ancla', nombre: 'Ancla del Abismo', era: 5, coste: 1500, maxNivel: 25, prioridad: 2.2, etiqueta: 'Mecánico', texto: 'Clava la Base a la pared: el grupo aguanta más.', efectos: { vidaMult: 1.06, defensaAdd: 3 } },
  { id: 'forja_honda', nombre: 'Forja del Fondo', era: 5, coste: 2500, maxNivel: 25, prioridad: 2, etiqueta: 'Fuego', texto: 'Funde la chatarra de las capas de arriba en filos para lo hondo.', efectos: { ataqueMult: 1.06 } },
  { id: 'faro', nombre: 'Faro de Lo Hondo', era: 5, coste: 4000, maxNivel: 20, prioridad: 1.6, etiqueta: 'Sagrado', texto: 'Una luz que llega hasta el fondo: más botín y menos Presión.', efectos: { oroMult: 1.06, presionAdd: -1 } },
];

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

// ----- Oficios: equipo fabricado -----
export interface SlotDef {
  id: EquipSlot;
  nombre: string;
  /** Efecto por punto de poder del objeto. */
  efectos: Efectos;
  /** Nombres base de los objetos (se combinan con el grado). */
  piezas: string[];
}

export const SLOTS: SlotDef[] = [
  { id: 'arma', nombre: 'Arma', efectos: { ataqueMult: 1.1 }, piezas: ['Cuchilla de Cable', 'Lanza de Andamio', 'Martillo de Remaches', 'Arpón de Niebla'] },
  { id: 'armadura', nombre: 'Armadura', efectos: { vidaMult: 1.08, defensaAdd: 4 }, piezas: ['Peto de Chapa', 'Capa de Lona Encerada', 'Coraza de Prisma', 'Arnés Reforzado'] },
  { id: 'accesorio', nombre: 'Accesorio', efectos: { criticoAdd: 0.012, danoCriticoAdd: 0.08 }, piezas: ['Lente de Aumento', 'Brújula Vertical', 'Monóculo de Cuarzo', 'Farol de Bolsillo'] },
];
export const SLOT_BY_ID = Object.fromEntries(SLOTS.map((s) => [s.id, s])) as Record<EquipSlot, SlotDef>;
export const GRADOS = ['', 'Mk I', 'Mk II', 'Mk III', 'Mk IV', 'Mk V', 'Mk VI', 'Mk VII', 'Mk VIII', 'Mk IX', 'Mk X'];

// ----- Bendiciones del Santuario -----
export interface BlessingDef {
  id: string;
  nombre: string;
  efectos: Efectos;
}
export const BLESSINGS: BlessingDef[] = [
  { id: 'filo', nombre: 'Bendición del Filo', efectos: { ataqueMult: 1.3 } },
  { id: 'cosecha', nombre: 'Bendición de la Cosecha', efectos: { oroMult: 1.5 } },
  { id: 'aliento', nombre: 'Bendición del Aliento', efectos: { regenMult: 2 } },
  { id: 'pulso', nombre: 'Bendición del Pulso', efectos: { velAtaqueMult: 1.2 } },
  { id: 'muro', nombre: 'Bendición del Muro', efectos: { defensaAdd: 30 } },
];
export const BLESSING_BY_ID = Object.fromEntries(BLESSINGS.map((b) => [b.id, b]));
