// Ruta de la jornada (EVENTOS_Y_RUTA.md §3): hitos fijos, sub-capas de Lo Hondo (5 h – 16 h)
// y el generador de Ciclos Invertidos (16 h +).
import type { Efectos } from '../core/mods';
import { artefacto, buff, oro, varios, type Efx } from './efx';

// ---------- hitos fijos antes de Lo Hondo ----------
export interface RouteHito {
  id: string;
  atMin: number;
  /** Era mínima (1–5): si aún no se alcanzó, el hito espera. */
  eraMin?: number;
  texto: string;
  efecto?: Efx;
}

export const ROUTE_HITOS: RouteHito[] = [
  { id: 'ruta_inicio', atMin: 5, texto: 'Comienza el descenso. El borde ya no se ve.' },
  { id: 'ruta_presion', atMin: 70, eraMin: 2, texto: 'El aire se vuelve espeso: a partir de aquí, la Presión cuenta.' },
  { id: 'ruta_mutacion', atMin: 165, eraMin: 3, texto: 'El cuerpo del Descensor empieza a cambiar: primera Mutación.', efecto: { t: 'mutacion', buena: true } },
  { id: 'ruta_cofre', atMin: 300, eraMin: 5, texto: 'Cofre de Jornada: cinco horas de descenso merecen algo.', efecto: varios(artefacto(3), oro(100)) },
  { id: 'ruta_suelo', atMin: 300, eraMin: 5, texto: 'El suelo se abre. Debajo de la Necrópolis no hay roca: hay Lo Hondo.' },
];

// ---------- mecánicas de sub-capa ----------
export interface MechanicDef {
  id: string;
  nombre: string;
  texto: string;
  efectos?: Efectos;
}

export const MECHANICS: MechanicDef[] = [
  { id: 'reflejos', nombre: 'Reflejos', texto: 'Cada criatura tiene un clon invertido bajo el suelo espejo; al caer el original, cae el reflejo y suelta su propio botín (+30 %).', efectos: { criaturaOroMult: 1.3 } },
  { id: 'carga', nombre: 'Carga', texto: 'Cada golpe acumula electricidad; al décimo, estalla en un rayo que hace ×5.' },
  { id: 'respiracion', nombre: 'Respiración', texto: 'El terreno se expande y se contrae cada 30 s: al expandirse se corre a ×1,5; al contraerse, a ×0,75.' },
  { id: 'flotacion', nombre: 'Flotación', texto: 'Sin gravedad: las criaturas llegan desde arriba y desde abajo (+2 por tramo) y el Descensor pelea girando.', efectos: { criaturasExtra: 2 } },
  { id: 'recuerdos', nombre: 'Recuerdos', texto: 'Cada baja deja un Recuerdo; cada 40 se lee un fragmento de lo que vivieron los que cayeron.' },
  { id: 'ensamblaje', nombre: 'Ensamblaje', texto: 'Capas a medio construir: mezcla de las 3 corrientes y criaturas sin terminar (−20 % de vida).', efectos: { criaturaVidaMult: 0.8 } },
  { id: 'escalada', nombre: 'Escalada', texto: 'Por dentro del esqueleto: una costilla cierra el paso cada 5 tramos y hay que romperla.' },
  { id: 'dejavu', nombre: 'Déjà vu', texto: 'La megaciudad de arriba, antigua e intacta: vuelven las criaturas del Brocal en su versión antigua.' },
  { id: 'pulso', nombre: 'Pulso', texto: 'Cada 10 s llega un latido: durante 2 s el daño se multiplica ×2,25.' },
  { id: 'glitch', nombre: 'Glitch', texto: 'Colores invertidos, la interfaz se deforma y los nombres de las criaturas llegan corruptos (+15 % de ataque, +40 % de botín).', efectos: { criaturaAtkMult: 1.15, criaturaOroMult: 1.4 } },
  { id: 'calma', nombre: 'Calma', texto: 'Sin criaturas los primeros 5 min: solo luz y silencio.' },
];
export const MECHANIC_BY_ID = Object.fromEntries(MECHANICS.map((m) => [m.id, m]));

// ---------- sub-capas con nombre de Lo Hondo (una por hora, 5 h – 16 h) ----------
export interface SubLayerDef {
  /** Hora trabajada en la que empieza. */
  hora: number;
  nombre: string;
  mecanica: string;
  /** Umbral con nombre de la sub-capa (aparece a esta hora:minuto). */
  umbral?: { atMin: number; nombre: string };
  hitos?: { atMin: number; texto: string; efecto?: Efx }[];
}

export const SUBLAYERS: SubLayerDef[] = [
  { hora: 5, nombre: 'El Mar de Mercurio', mecanica: 'reflejos', umbral: { atMin: 350, nombre: 'La Reina del Reflejo' } },
  { hora: 6, nombre: 'La Catedral de Estática', mecanica: 'carga', hitos: [{ atMin: 390, texto: 'Un órgano gigante suena. Todos los enemigos bailan un minuto sin atacar.', efecto: buff(1, { criaturaAtkMult: 0 }) }] },
  { hora: 7, nombre: 'El Jardín que Respira', mecanica: 'respiracion', hitos: [{ atMin: 450, texto: 'EL PRIMER FONDO. Parece el final… y el suelo se rompe. No era el fondo.', efecto: { t: 'tramos', n: 3 } }] },
  { hora: 8, nombre: 'La Zona Sin Gravedad', mecanica: 'flotacion', umbral: { atMin: 530, nombre: 'El Satélite Hundido' } },
  { hora: 9, nombre: 'El Archivo de los Ahogados', mecanica: 'recuerdos', hitos: [{ atMin: 570, texto: 'Se lee un fragmento que explica qué es la Grieta (1 de 3).', efecto: { t: 'lore' } }] },
  { hora: 10, nombre: 'La Fábrica de Capas', mecanica: 'ensamblaje', umbral: { atMin: 650, nombre: 'El Capataz' }, hitos: [{ atMin: 600, texto: 'PLACA BLANCA: el rango más alto que reconoce la superficie.' }] },
  { hora: 11, nombre: 'Los Huesos del Gigante', mecanica: 'escalada', hitos: [{ atMin: 690, texto: 'Un segundo fragmento sobre la Grieta (2 de 3).', efecto: { t: 'lore' } }] },
  { hora: 12, nombre: 'La Ciudad Original', mecanica: 'dejavu', umbral: { atMin: 721, nombre: 'El Alcalde de Polvo' } },
  { hora: 13, nombre: 'El Latido', mecanica: 'pulso', hitos: [{ atMin: 810, texto: 'El último fragmento: la revelación (3 de 3).', efecto: { t: 'lore' } }] },
  { hora: 14, nombre: 'La Frontera de Ruido', mecanica: 'glitch', umbral: { atMin: 890, nombre: 'Lo Que Escribe el Mundo' } },
  { hora: 15, nombre: 'El Fondo', mecanica: 'calma', hitos: [{ atMin: 930, texto: 'GRAN HITO: el fondo es un cielo. El Descensor cae a través de él hacia otro cielo. Placa Sin Nombre.', efecto: artefacto(4) }] },
];

/** A partir de esta hora empiezan los Ciclos Invertidos (infinitos). */
export const CICLOS_DESDE_HORA = 16;
/** Cada ciclo dura estas horas; al completarse sube el Grado de Ciclo. */
export const CICLO_HORAS = 4;

// ---------- plantillas del generador infinito de sub-capas ----------
export interface SubLayerTemplate {
  /** Primera parte del nombre. */
  lugar: string;
  /** Segundas partes posibles. */
  de: string[];
}

export const SUBLAYER_TEMPLATES: SubLayerTemplate[] = [
  { lugar: 'El Mar de', de: ['Vidrio', 'Ceniza Tibia', 'Voces'] },
  { lugar: 'La Catedral de', de: ['Óxido', 'Raíces', 'Niebla'] },
  { lugar: 'El Jardín de', de: ['Antenas', 'Espejos', 'Huesos'] },
  { lugar: 'La Zona Sin', de: ['Nombre', 'Peso', 'Eco'] },
  { lugar: 'El Archivo de', de: ['los Caídos', 'lo No Dicho', 'las Placas'] },
  { lugar: 'La Fábrica de', de: ['Sombras', 'Lluvia', 'Cielos'] },
  { lugar: 'Los Huesos de', de: ['la Ciudad', 'la Máquina', 'la Garza'] },
  { lugar: 'La Ciudad de', de: ['Abajo', 'Sal', 'Nadie'] },
  { lugar: 'El Latido de', de: ['Cobre', 'la Roca', 'lo Hondo'] },
  { lugar: 'La Frontera de', de: ['Estática', 'Agua Quieta', 'Luz'] },
  { lugar: 'El Pozo de', de: ['los Relojes', 'las Esporas', 'Mercurio'] },
  { lugar: 'La Escalera de', de: ['Humo', 'Cristal', 'Vértebras'] },
  { lugar: 'El Bosque de', de: ['Cables Vivos', 'Columnas', 'Farolas'] },
  { lugar: 'La Marea de', de: ['Tinta', 'Polvo', 'Neón'] },
  { lugar: 'El Templo de', de: ['la Caída', 'los Reflejos', 'la Última Placa'] },
];

/** Nombres de los Umbrales procedurales de los Ciclos Invertidos. */
export const CICLO_UMBRALES = ['El Custodio', 'La Madre', 'El Coro', 'La Sombra', 'El Testigo', 'La Puerta', 'El Heraldo', 'La Marea'];

// ---------- lore ----------
export const LORE = [
  'La Grieta no se abrió: se despertó. La ciudad creció alrededor de su boca sin saberlo.',
  'Cada noche la Grieta olvida su forma y la vuelve a soñar. Por eso ninguna ruta se repite.',
  'No hay fondo. Hay otro cielo, y alguien allí que también mira hacia abajo preguntándose qué hay.',
];
export const RECUERDOS = [
  'Recuerdo: una mujer cuenta peldaños en voz alta. Pierde la cuenta en el mismo número cada vez.',
  'Recuerdo: un niño suelta una moneda por el pozo y espera el sonido. Sigue esperando.',
  'Recuerdo: «Mi placa era de cobre. Aquí abajo ya no importa el metal».',
  'Recuerdo: alguien dibuja un mapa sobre la niebla con el dedo. Dura lo que dura.',
  'Recuerdo: una expedición entera, sentada, mirando una flor que no deberían mirar.',
  'Recuerdo: un Descensor se quita el casco para oír mejor. Sonríe.',
  'Recuerdo: «Dile a los de arriba que la lluvia viene de aquí».',
  'Recuerdo: una base colgante, vacía, con todas las luces encendidas.',
];
/** Cada cuántas bajas con la mecánica Recuerdos aparece un fragmento. */
export const RECUERDOS_CADA = 40;
