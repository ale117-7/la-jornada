// Cadenas: historias de varias partes (EVENTOS_Y_RUTA.md §5). Cada día se activan 2–3.
import { artefacto, azar, buff, elite, NADA, oro, perm, tramos, varios, type Efx } from './efx';
import type { Corriente } from './tags';

export interface ChainPart {
  /** Ventana en minutos trabajados [desde, hasta]. */
  ventanaMin: [number, number];
  textoLog: string;
  efecto: Efx;
}

export interface ChainDef {
  id: string;
  nombre: string;
  /** Corrientes iniciales compatibles ('*' = cualquiera). */
  corriente: (Corriente | '*')[];
  partes: ChainPart[];
}

export const CHAINS: ChainDef[] = [
  {
    id: 'senal', nombre: 'La Señal', corriente: ['*'],
    partes: [
      { ventanaMin: [90, 120], textoLog: 'Una antena capta latidos que vienen de abajo.', efecto: NADA },
      { ventanaMin: [260, 290], textoLog: 'Los latidos se triangulan. Tienen ritmo humano.', efecto: oro(20) },
      { ventanaMin: [520, 540], textoLog: 'La fuente de la señal: un Descensor dormido. Despierta y se une al grupo.', efecto: perm({ ataqueMult: 1.3, vidaMult: 1.2 }) },
    ],
  },
  {
    id: 'mapa', nombre: 'El Mapa del Cartógrafo', corriente: ['*'],
    partes: [
      { ventanaMin: [60, 120], textoLog: 'Primera pieza del mapa del Cartógrafo.', efecto: oro(10) },
      { ventanaMin: [150, 210], textoLog: 'Segunda pieza del mapa: las líneas empiezan a casar.', efecto: oro(15) },
      { ventanaMin: [240, 300], textoLog: 'Tercera pieza del mapa. Falta una esquina.', efecto: oro(20) },
      { ventanaMin: [330, 420], textoLog: 'El mapa está completo: un atajo de 20 tramos y una capa que no sale en ningún otro.', efecto: varios(tramos(20), buff(15, { criaturaOroMult: 2 }, 'brillo')) },
    ],
  },
  {
    id: 'deuda', nombre: 'La Deuda', corriente: ['N'],
    partes: [
      { ventanaMin: [60, 100], textoLog: 'Un prestamista te llena la bolsa. «Ya hablaremos».', efecto: oro(60) },
      { ventanaMin: [180, 220], textoLog: 'Llegan los cobradores del prestamista.', efecto: elite('Cobradores de la Deuda', 18, 2.2, artefacto(2)) },
      { ventanaMin: [230, 280], textoLog: 'La deuda queda saldada. Nadie volverá a preguntar.', efecto: oro(30) },
    ],
  },
  {
    id: 'semilla', nombre: 'La Semilla', corriente: ['A'],
    partes: [
      { ventanaMin: [100, 130], textoLog: 'Alguien planta una semilla en la Base.', efecto: perm({ produccionMult: 1.05 }) },
      { ventanaMin: [160, 190], textoLog: 'La semilla ya es un brote que busca los cables.', efecto: perm({ produccionMult: 1.1 }) },
      { ventanaMin: [220, 250], textoLog: 'El brote es un arbolito. La Base huele a tierra.', efecto: perm({ produccionMult: 1.1 }) },
      { ventanaMin: [280, 340], textoLog: 'El árbol envuelve la Base entera. Todo produce el doble.', efecto: perm({ produccionMult: 2 }) },
    ],
  },
  {
    id: 'huesped', nombre: 'El Huésped', corriente: ['S'],
    partes: [
      { ventanaMin: [90, 120], textoLog: 'Un cuerpo vacío sigue al grupo. No pelea. Mira.', efecto: NADA },
      { ventanaMin: [150, 180], textoLog: 'El Huésped imita un gesto de combate.', efecto: perm({ golpeFuerte: 0.3 }) },
      { ventanaMin: [210, 240], textoLog: 'El Huésped ha aprendido otro truco del grupo.', efecto: perm({ criticoAdd: 0.03 }) },
      { ventanaMin: [300, 330], textoLog: 'El Huésped despierta. Sabe todo lo que el grupo sabe.', efecto: perm({ ataqueMult: 1.25, velAtaqueMult: 1.15 }) },
    ],
  },
  {
    id: 'cartas', nombre: 'Cartas de Arriba', corriente: ['*'],
    partes: [
      { ventanaMin: [60, 90], textoLog: 'Carta de arriba: «Dejé tu taza donde estaba. No sé por qué».', efecto: oro(10) },
      { ventanaMin: [180, 210], textoLog: 'Carta de arriba: «Hoy llovió hacia tu lado del pozo».', efecto: oro(15) },
      { ventanaMin: [300, 330], textoLog: 'Carta de arriba: «Si lees esto, ya estás más lejos que nadie que conozca».', efecto: oro(20) },
      { ventanaMin: [420, 450], textoLog: 'Última carta: «No vuelvas por mí. Vuelve cuando hayas visto el fondo».', efecto: perm({ regenMult: 1.5 }) },
    ],
  },
  {
    id: 'rival', nombre: 'El Rival', corriente: ['*'],
    partes: [
      { ventanaMin: [120, 150], textoLog: 'Un Descensor rival os corta el paso. Solo quiere medirse.', efecto: elite('El Rival', 10, 1.6, oro(30)) },
      { ventanaMin: [240, 270], textoLog: 'El Rival vuelve. Ha aprendido.', efecto: elite('El Rival', 20, 2.2, oro(50)) },
      { ventanaMin: [360, 390], textoLog: 'El Rival otra vez, con equipo nuevo y la misma mirada.', efecto: elite('El Rival', 35, 3, oro(80)) },
      { ventanaMin: [720, 720], textoLog: 'Duelo final contra el Rival, en la Ciudad Original.', efecto: elite('El Rival, por última vez', 80, 4, artefacto(4)) },
    ],
  },
  {
    id: 'plaga', nombre: 'La Plaga Lenta', corriente: ['*'],
    partes: [
      { ventanaMin: [100, 130], textoLog: 'Una mancha gris aparece en un módulo de la Base.', efecto: buff(30, { produccionMult: 0.8 }) },
      { ventanaMin: [170, 210], textoLog: 'La plaga se extiende. Se busca con qué curarla.', efecto: buff(30, { produccionMult: 0.7 }) },
      { ventanaMin: [240, 300], textoLog: 'Tres ingredientes, una cura. La Base queda inmune y más fuerte.', efecto: perm({ produccionMult: 1.3, vidaMult: 1.1 }) },
    ],
  },
  {
    id: 'nino_hojalata', nombre: 'El Niño de Hojalata', corriente: ['S', 'N'],
    partes: [
      { ventanaMin: [80, 110], textoLog: 'Un robot pequeño, perdido, se esconde tras el Descensor.', efecto: perm({ regenMult: 1.1 }) },
      { ventanaMin: [200, 240], textoLog: 'El Niño de Hojalata ya no se esconde. Avisa de los golpes.', efecto: perm({ defensaAdd: 10 }) },
      { ventanaMin: [330, 360], textoLog: 'El Niño de Hojalata era una llave. Una puerta de Lo Hondo se abre para él.', efecto: varios(tramos(5), artefacto(3)) },
    ],
  },
  {
    id: 'procesion', nombre: 'La Procesión', corriente: ['A'],
    partes: [
      { ventanaMin: [110, 140], textoLog: 'Criaturas pacíficas bajan en fila, sin mirar a nadie.', efecto: buff(10, { criaturaAtkMult: 0.5 }) },
      { ventanaMin: [190, 220], textoLog: 'El grupo sigue a la procesión por un paso que no estaba.', efecto: tramos(2) },
      { ventanaMin: [260, 300], textoLog: 'El santuario de la procesión. Miran al Descensor y deciden.', efecto: azar(0.6, perm({ vidaMult: 1.2, regenMult: 1.3 }), elite('Guardián del Santuario', 30, 2.5, artefacto(3))) },
    ],
  },
];

export const CHAIN_BY_ID = Object.fromEntries(CHAINS.map((c) => [c.id, c]));

/** La Cadena A sigue los hitos de la ruta (1:30, 4:30 y 8:50); la B empieza a las 3:00. */
export const CHAIN_A_MIN = [90, 270, 530];
export const CHAIN_B_FIRST_MIN = 180;
