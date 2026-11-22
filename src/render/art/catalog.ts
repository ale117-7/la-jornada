// Catálogo de arte: qué hoja de IMAGENES/ (ya empaquetada) dibuja cada cosa del juego y qué
// cuadros forman cada animación. Las filas y columnas son las de los recortes (`rF_cNN.png`).
// Para cambiar un sprite basta con tocar su entrada aquí; el renderer no sabe de hojas.
import type { Corriente } from '../../data/tags';
import { A, hasSheet, row, type ArtDef, type Ref } from './sprites';

const R = (r: number, ...cols: number[]): Ref[] => cols.map((c) => [r, c]);

// ---------- el Descensor y sus chasis ----------

/** El Descensor base: la bufanda y el visor cambian con la corriente del día. */
export const HERO: Record<Corriente, ArtDef> = {
  N: {
    sheet: 'el-descensor', ref: [1, 1], h: 2.35,
    anims: {
      idle: A(R(1, 1), 1),
      run: A([...R(2, 1, 2, 3, 4), [3, 1]], 11),
      attack: A(R(4, 1), 8),
      hurt: A(R(4, 4), 1),
      death: A(row(5, 1, 6), 9, false),
      respawn: A(row(6, 1, 4), 7, false),
    },
  },
  S: {
    sheet: 'el-descensor', ref: [1, 2], h: 2.35,
    anims: {
      idle: A(R(1, 2), 1),
      run: A(R(3, 2, 3, 4), 9),
      attack: A(R(4, 2, 3), 10),
      death: A(row(5, 1, 6), 9, false),
      respawn: A(row(6, 1, 4), 7, false),
    },
  },
  A: {
    sheet: 'el-descensor', ref: [1, 3], h: 2.35,
    anims: {
      idle: A(R(1, 3), 1),
      run: A([...R(2, 5, 6, 7), ...R(3, 5, 6)], 11),
      attack: A(R(3, 5), 8),
      death: A(row(5, 1, 6), 9, false),
      respawn: A(row(6, 1, 4), 7, false),
    },
  },
};

/** El Descensor de Ayer (rareza): fantasma azulado que corre a tu lado. */
export const HERO_AYER: ArtDef = { sheet: 'el-descensor-de-ayer', ref: [2, 1], h: 2.1, anims: { idle: A(R(2, 1), 1), run: A(row(2, 1, 7), 11) }, portrait: [1, 2] };

/** Chasis elegidos en la primera Encrucijada (por id de chasis). */
export const CHASSIS_ART: Record<string, ArtDef> = {
  brasa: { sheet: 'chasis-brasa', ref: [1, 1], h: 2.45, anims: { idle: A(R(1, 1, 2), 2), run: A(row(2, 1, 6), 11) } },
  raiz: { sheet: 'chasis-raiz', ref: [1, 1], h: 2.45, anims: { idle: A(R(1, 1, 2), 2), run: A(row(2, 1, 6), 11) } },
  ganzua: {
    sheet: 'chasis-ganzua', ref: [1, 1], h: 2.3,
    anims: { idle: A(row(1, 1, 8), 8), run: A(row(2, 1, 9), 13), attack: A(row(3, 3, 7), 18), death: A(row(6, 1, 8), 11, false) },
  },
  sabueso: {
    sheet: 'chasis-sabueso', ref: [1, 1], h: 2.3,
    anims: { idle: A(row(1, 1, 8), 8), run: A(row(2, 1, 9), 13), attack: A(row(3, 3, 7), 18), death: A(row(6, 1, 8), 11, false) },
  },
  monolito: { sheet: 'chasis-monolito', ref: [2, 1], h: 2.5, anims: { idle: A(R(2, 1), 1), run: A(row(1, 1, 7), 10) } },
  eco: { sheet: 'chasis-eco', ref: [1, 1], h: 2.5, anims: { idle: A(R(1, 1), 1), run: A(row(2, 1, 7), 11) } },
};

// ---------- compañeros ----------

const comp = (sheet: string, idle: number, run: number, evolved: Ref[], fps = 7): ArtDef => ({
  sheet, ref: [1, 1], h: 1.75,
  anims: { idle: A(row(1, 1, idle), fps), run: A(row(2, 1, run), 11), ...(evolved.length ? { evolved: A(evolved, evolved.length > 1 ? 10 : 1) } : {}) },
});
export const COMPANION_ART: Record<string, ArtDef> = {
  grom: comp('grom-el-herrero-errante', 4, 6, R(3, 4)),
  lysa: comp('lysa-sanadora-del-alba', 4, 6, []), // su cuadro evolucionado es casi todo luz: se usa el aura del código
  pip: comp('pip-ratero-de-cornisa', 3, 6, row(3, 1, 4)),
  vesna: comp('vesna-tiradora-de-azotea', 5, 5, row(3, 1, 5)),
  orun: comp('orun-portador-del-farol', 5, 5, row(3, 1, 5)),
  ilka: comp('ilka-buceadora-de-niebla', 5, 5, row(3, 1, 5)),
  tarsis: comp('tarsis-centinela-desertor', 5, 5, row(3, 1, 5)),
  mu: comp('mu-la-jardinera-ciega', 5, 5, row(3, 1, 5)),
  kestrel: comp('kestrel-cartografa-de-cables', 5, 5, row(3, 1, 5)),
  brasa: comp('brasa-nino-del-horno', 5, 5, row(3, 1, 5)),
  nix: comp('nix-sombra-alquilada', 5, 5, row(3, 1, 5)),
  odalis: comp('odalis-marea-quieta', 5, 5, row(3, 1, 5)),
  fenn: comp('fenn-domador-de-polillas', 5, 5, row(3, 1, 5)),
  hueso: comp('hueso-monje-del-eco', 5, 5, row(3, 1, 5)),
  sal: comp('sal-recolectora-de-escarcha', 5, 5, row(3, 1, 5)),
  quill: comp('quill-archivista-toxico', 5, 5, row(3, 1, 5)),
};

// ---------- mascotas del Criadero ----------

const pet = (sheet: string, n = 7): ArtDef => ({ sheet, ref: [1, 1], h: 0.8, anims: { idle: A(row(1, 1, n), 9) } });
export const PET_ART: Record<string, ArtDef> = {
  polilla_farol: pet('polilla-farol', 6),
  rata_cable: pet('rata-de-cable'),
  cangrejito: pet('cangrejo-de-bolsillo'),
  dron_colibri: pet('dron-colibri'),
  brote: pet('brote-andante'),
  chispa: pet('chispa-errante'),
  prisma_vivo: pet('prisma-vivo'),
  sombra_mansa: pet('sombra-mansa', 9),
};

// ---------- criaturas (miran a la izquierda, hacia el Descensor) ----------

const cr = (sheet: string, h: number, idle: Ref[], attack: Ref[], hurt?: Ref[], ifps = 7): ArtDef => ({
  sheet, ref: idle[0], h, left: true,
  anims: { idle: A(idle, ifps), attack: A(attack, 10, false), ...(hurt ? { hurt: A(hurt, 1) } : {}) },
});
export const FAMILY_ART: Record<string, ArtDef> = {
  dron_sabueso: cr('dron-sabueso', 1.45, row(1, 1, 5), row(2, 1, 4), R(3, 2)),
  chatarrero: cr('chatarrero-aumentado', 1.75, row(1, 1, 8), row(3, 1, 3), undefined, 9),
  enjambre_cables: cr('enjambre-de-cables', 1.55, row(1, 1, 4), row(2, 1, 3), R(3, 1)),
  perro_chapa: cr('perro-de-chapa', 1.45, row(1, 1, 4), row(3, 1, 3)),
  centinela_prisma: cr('centinela-prisma', 1.35, R(1, 1, 2), R(5, 1, 2)),
  cuerpo_vacio: cr('cuerpo-vacio', 1.5, R(1, 1, 2), R(1, 5)),
  glitch_errante: cr('glitch-errante', 1.2, R(1, 1), R(1, 5)),
  constructo_luz: cr('constructo-de-luz', 1.25, R(1, 1), R(4, 4)),
  polilla_ceniza: cr('polilla-de-ceniza', 1.3, R(1, 1, 2), R(1, 5)),
  lirio_dentado: cr('lirio-dentado', 1.35, R(1, 1), R(1, 5)),
  garza_vacio: cr('garza-del-vacio', 1.3, R(1, 1), R(1, 5)),
  cangrejo_relicario: cr('cangrejo-relicario', 1.3, R(1, 1), R(1, 5)),
};

/**
 * Híbridos: algunas hojas traen la criatura con la paleta de otra corriente (mismo dibujo,
 * otros colores). Si no hay variante, el código la tiñe con el color de la otra corriente.
 */
export const FAMILY_HIB: Record<string, Partial<Record<Corriente, Ref>>> = {
  dron_sabueso: { S: [4, 5], A: [4, 9] },
  centinela_prisma: { N: [3, 1], A: [3, 2] },
  glitch_errante: { N: [2, 1], A: [2, 4] },
  constructo_luz: { N: [1, 3], A: [1, 4] },
  polilla_ceniza: { N: [2, 1], S: [1, 3] },
  lirio_dentado: { N: [1, 2], S: [1, 4] },
  garza_vacio: { N: [1, 2], S: [1, 4] },
  cangrejo_relicario: { N: [1, 3], S: [1, 4] },
};

// ---------- Umbrales, élites y jefes (miran a la izquierda) ----------

/** Jefe estándar de la hoja: [retrato?] reposo · ataque · herido · derrota. */
const boss = (sheet: string, h: number, a: { idle: Ref[]; attack: Ref[]; hurt?: Ref[]; death?: Ref[]; portrait?: Ref }): ArtDef => ({
  sheet, ref: a.idle[0], h, left: true, portrait: a.portrait,
  anims: { idle: A(a.idle, 6), attack: A(a.attack, 8, false), ...(a.hurt ? { hurt: A(a.hurt, 1) } : {}), ...(a.death ? { death: A(a.death, 7, false) } : {}) },
});
/** Hoja con retrato en (1,1), reposo en el resto de la fila 1, ataque en la 2 y derrota en la 3. */
const bossP = (sheet: string, h: number, idleN: number, atkN: number, deathN: number): ArtDef =>
  boss(sheet, h, { portrait: [1, 1], idle: row(1, 2, idleN + 1), attack: row(2, 1, atkN), death: row(3, 1, deathN) });
/** Hoja sin retrato: reposo · ataque · herido · derrota (filas 1–4). */
const boss4 = (sheet: string, h: number, idleN: number, atkN: number, deathN: number): ArtDef =>
  boss(sheet, h, { idle: row(1, 1, idleN), attack: row(2, 1, atkN), hurt: R(3, 1), death: row(4, 1, deathN) });

/** Jefe de era por capa (0–4) y corriente. */
export const ERA_BOSS_ART: Record<Corriente, ArtDef>[] = [
  {
    N: boss('grua-de-seguridad', 2.3, { idle: row(3, 1, 4), attack: R(4, 1, 2), death: [[5, 1], [5, 2], [7, 1], [7, 2]], portrait: [2, 1] }),
    S: boss('torre-de-medicion', 2.4, { idle: row(1, 1, 4), attack: [...row(2, 1, 3), ...row(3, 1, 3)], death: row(4, 1, 3) }),
    A: bossP('garza-anciana', 2.3, 4, 4, 4),
  },
  {
    N: boss('excavadora-poseida', 2.1, { idle: R(1, 1, 2), attack: [[1, 3], [2, 1], [2, 2]], death: row(3, 1, 4), portrait: [4, 1] }),
    S: boss4('andamio-consciente', 2.2, 4, 4, 5),
    A: bossP('nido-madre', 2.2, 4, 4, 5),
  },
  {
    N: boss('servidor-raiz', 2.4, { idle: row(1, 1, 4), attack: R(2, 1, 2), hurt: R(3, 1), death: row(4, 1, 3), portrait: [5, 1] }),
    S: boss('prisma-madre', 2.2, { idle: row(1, 1, 4), attack: row(2, 1, 4), hurt: R(3, 1), death: row(4, 1, 4), portrait: [4, 5] }),
    A: bossP('arbol-madre', 2.4, 4, 4, 5),
  },
  {
    N: boss('ceo-fantasma-en-su-exoesqueleto', 2.3, { idle: row(1, 1, 4), attack: R(2, 1, 2), hurt: R(3, 1), death: [...R(4, 1, 2), ...row(5, 2, 4)], portrait: [5, 1] }),
    S: boss('arquitecto-final', 2.3, { idle: row(1, 1, 3), attack: [[1, 4], [2, 1]], hurt: R(3, 1), death: row(4, 1, 4), portrait: [4, 5] }),
    A: bossP('coloso-fosilizado', 2.4, 4, 5, 5),
  },
  {
    N: boss('eco-de-neon', 2.0, { idle: R(1, 1, 2), attack: [[2, 1], [2, 2]], death: R(5, 2), portrait: [5, 1] }),
    S: boss('eco-sintetico', 2.2, { idle: row(1, 2, 5), attack: row(2, 1, 3), hurt: R(3, 1), death: row(4, 1, 4), portrait: [1, 1] }),
    A: bossP('eco-abismal', 2.2, 4, 5, 5),
  },
];

/** Umbral menor (cada 10 tramos): una fila por corriente. */
export const UMBRAL_MENOR_ART: Record<Corriente, ArtDef> = {
  N: boss('umbral-menor', 1.9, { idle: row(1, 1, 4), attack: R(1, 3, 4) }),
  S: boss('umbral-menor', 1.9, { idle: row(2, 1, 4), attack: R(2, 3, 4) }),
  A: boss('umbral-menor', 1.9, { idle: row(3, 1, 4), attack: R(3, 3, 4) }),
};

/** La Costilla del Gigante (Escalada): membrana entera, a media vida y rota. */
export const COSTILLA_ART: ArtDef = {
  sheet: 'costilla-del-gigante', ref: [1, 1], h: 2.4, left: true,
  anims: { idle: A(row(1, 1, 4), 5), mid: A(row(2, 1, 3), 5), broken: A(R(3, 1), 1) },
};

/** Los 8 Umbrales procedurales de los Ciclos Invertidos (grupos de la hoja común). */
const CICLO_GRUPOS: [Ref[], Ref[]][] = [
  [R(1, 1, 2, 3), R(2, 1, 2)],
  [R(1, 4, 5, 6), R(2, 3, 4)],
  [R(1, 7, 8), R(2, 5)],
  [R(1, 9, 10), R(2, 6, 7)],
  [R(3, 1, 2, 3), R(4, 1, 2, 3)],
  [R(3, 4, 5, 6), R(4, 4, 5)],
  [R(3, 7, 8), R(4, 6, 7)],
  [R(3, 9, 10), R(4, 8, 9)],
];
export const CICLO_ART: ArtDef[] = CICLO_GRUPOS.map(([idle, attack]) => boss('umbrales-de-los-ciclos-invertidos', 2.2, { idle, attack }));

/** Élites y Umbrales con nombre propio (por el nombre exacto con que aparecen). */
export const ELITE_ART: Record<string, ArtDef> = {
  'Criatura Dorada': boss('criatura-dorada', 1.7, { idle: row(1, 1, 4), attack: row(2, 1, 3), death: row(3, 1, 6) }),
  'Umbral Errante': boss('umbral-errante', 1.9, { idle: row(1, 1, 4), attack: row(2, 1, 3), hurt: R(3, 1) }),
  'El Rival, por última vez': boss('el-rival-por-ultima-vez', 2.0, { idle: row(1, 1, 4), attack: row(2, 1, 3), hurt: R(3, 1) }),
  'Cazador de Descensores': boss('cazador-de-descensores', 1.8, { idle: row(1, 1, 4), attack: R(2, 1, 2), hurt: R(3, 1), death: R(4, 1, 2) }),
  'Cobradores de la Deuda': boss('cobradores-de-la-deuda', 1.8, { idle: row(1, 1, 4), attack: row(2, 1, 4), hurt: R(4, 1) }),
  'Depredador del Techo': bossP('depredador-del-techo', 1.9, 4, 3, 4),
  'El Gigante Dormido': bossP('el-gigante-dormido', 2.0, 4, 3, 1),
  'El Coloso Dormido': bossP('el-gigante-dormido', 2.3, 4, 3, 1),
  'Guardián del Santuario': bossP('guardian-del-santuario', 2.0, 4, 4, 4),
  'La Reina del Reflejo': boss4('la-reina-del-reflejo', 2.3, 5, 5, 6),
  'El Satélite Hundido': boss4('el-satelite-hundido', 2.2, 4, 4, 6),
  'El Capataz': boss4('el-capataz', 2.0, 4, 4, 6),
  'El Alcalde de Polvo': boss4('el-alcalde-de-polvo', 2.2, 4, 4, 6),
  'Lo Que Escribe el Mundo': boss4('lo-que-escribe-el-mundo', 2.3, 4, 4, 6),
  // El Rival de la cadena es un Descensor: mira a la derecha en su hoja (se voltea al dibujarlo).
  'El Rival': { sheet: 'el-rival', ref: [1, 1], h: 2.35, anims: { idle: A(R(1, 1), 1), attack: A(row(1, 2, 8), 12) } },
};

// ---------- personajes de sucesos (retratos para avisos y figurantes en la cornisa) ----------

const npc = (sheet: string, idle: Ref[], walk?: Ref[], h = 2.3): ArtDef => ({ sheet, ref: idle[0], h, portrait: idle[0], anims: { idle: A(idle, 3), ...(walk ? { run: A(walk, 9) } : {}) } });
/** Por id de suceso. */
export const NPC_ART: Record<string, ArtDef> = {
  mercader_paraguas: npc('mercader-de-paraguas', row(1, 1, 3), undefined, 2.7),
  descensor_perdido: npc('descensor-perdido', R(1, 1), row(2, 1, 7)),
  nina_farol: npc('la-nina-del-farol', R(1, 1, 2), row(2, 1, 6), 2.0),
  cuerpo_repuesto: npc('cuerpo-de-repuesto', R(1, 1), undefined, 2.8),
  predicador: npc('predicador-del-borde', row(1, 1, 3), undefined, 2.5),
  expedicion_rival: npc('expedicion-rival', R(1, 1), row(1, 2, 8)),
  eco_caido: npc('eco-de-un-descensor-caido', row(1, 1, 4), row(3, 1, 4)),
  coleccionista: npc('el-coleccionista-sin-rostro', R(1, 1), row(2, 1, 7), 2.6),
  contrabandista: npc('contrabandista-de-recuerdos', row(1, 1, 3), undefined, 2.5),
  archivista: npc('la-archivista', R(1, 1), row(2, 1, 6)),
  mapas_falsos: npc('vendedor-de-mapas-falsos', R(1, 1), R(2, 1, 2), 2.5),
  ermitano: npc('ermitano-de-la-pared', R(1, 1, 2), row(2, 1, 6), 2.4),
};
/** Personajes de cadenas, por el nombre de la cadena o del paso. */
export const CHAIN_NPC_ART: Record<string, ArtDef> = {
  rival: npc('el-rival', R(1, 1), row(2, 1, 7)),
  nino_hojalata: npc('el-nino-de-hojalata', R(1, 1), row(2, 1, 7), 2.2),
  huesped: npc('el-huesped', R(1, 1), row(2, 1, 6)),
};

// ---------- iconos ----------

export const ICONS = 'iconos-de-los-demas-sucesos';
/** Icono del aviso de cada suceso: [hoja, fila, columna]. */
export const EVENT_ICON: Record<string, [string, number, number]> = {
  manada: [ICONS, 6, 1], lluvia_acida: [ICONS, 4, 3], niebla_viva: [ICONS, 4, 9], lluvia_ascendente: [ICONS, 4, 2],
  corte_senal: [ICONS, 3, 10], silencio_absoluto: [ICONS, 2, 6], marea_estatica: [ICONS, 5, 9], nieve_ceniza: [ICONS, 4, 1],
  viento_fondo: [ICONS, 4, 5], lluvia_chatarra: [ICONS, 5, 7], festival_base: [ICONS, 1, 3], sabotaje: [ICONS, 3, 3],
  cable_roto: [ICONS, 3, 10], nacimiento: [ICONS, 6, 2], suministros: [ICONS, 7, 8], plaga_oxido: [ICONS, 4, 7],
  inventor: [ICONS, 7, 6], refugiados: [ICONS, 6, 7], antena: [ICONS, 6, 8], discusion: [ICONS, 3, 7],
  juramento: [ICONS, 3, 5], sueno_compartido: [ICONS, 1, 2], mutacion_espontanea: [ICONS, 7, 5], traicion: [ICONS, 8, 3],
  leccion: [ICONS, 7, 9], nostalgia: [ICONS, 8, 2], cofre_sellado: [ICONS, 2, 10], capsula_tiempo: [ICONS, 1, 10],
  bolsillo_esporas: [ICONS, 6, 3], caja_negra: [ICONS, 5, 3], mapa_mojado: [ICONS, 7, 10], pieza_mapa: [ICONS, 7, 9],
  altar: [ICONS, 1, 9], emboscada: [ICONS, 3, 2], derrumbe: [ICONS, 1, 7], protocolo_purga: [ICONS, 4, 7],
  pico_presion: [ICONS, 5, 2], plaga_glitches: [ICONS, 8, 10], jefe_errante: [ICONS, 3, 4], cazador: [ICONS, 3, 1],
  // Escenas con icono propio en su hoja.
  apagon: ['apagon', 6, 1], eclipse_neon: ['eclipse-de-neon', 1, 1], marea_negra: ['marea-negra', 2, 5],
  luna_interior: ['luna-interior', 1, 1], tormenta_esporas: ['tormenta-de-esporas', 3, 5],
  tren_fantasma: [ICONS, 5, 8], ballena_niebla: ['la-ballena-de-niebla', 2, 1], ciudad_espejo: ['la-ciudad-espejo', 1, 2],
  telefono_pared: ['el-telefono-de-la-pared', 2, 5], descensor_ayer: ['el-descensor-de-ayer', 1, 2],
  lluvia_placas: ['lluvia-de-placas', 1, 4], puerta_pintada: ['la-puerta-pintada', 1, 5], jardin_relojes: ['el-jardin-de-relojes', 1, 5],
  la_mirada: ['la-mirada', 1, 5], la_cancion: ['la-cancion', 1, 4],
  // Élites con retrato.
  depredador_techo: ['depredador-del-techo', 1, 1], gigante_dormido: ['el-gigante-dormido', 1, 1], criatura_dorada: ['criatura-dorada', 1, 1],
};

/** Modificadores de criatura: la hoja sigue el orden de MODIFIERS (7 por fila). */
export const MOD_SHEET = 'modificadores-de-criatura';
export const modIcon = (i: number): Ref => [Math.floor(i / 7) + 1, (i % 7) + 1];

/** Mutaciones del Descensor (orden de MUTATIONS; la hoja tiene un dibujo de más en (3,5)). */
export const MUT_SHEET = 'mutaciones-del-descensor';
const MUT_REFS: Ref[] = [...R(1, 1, 2, 3, 4, 5, 6), ...R(2, 1, 2, 3, 4, 5, 6), ...R(3, 1, 2, 3, 4), ...R(4, 1, 2, 3, 4)];
export const mutIcon = (i: number): Ref => MUT_REFS[i] ?? [1, 1];

/** Sinergias: orden de TAGS (5 por fila). */
export const SYN_SHEET = 'sinergias';
export const synIcon = (i: number): Ref => [Math.floor(i / 5) + 1, (i % 5) + 1];

/** Placas de rango: Óxido · Cobre · Plata · Cobalto · Obsidiana · Placa Blanca · Sin Nombre. */
export const PLACA_SHEET = 'placas-de-rango';
export const PLACAS: { nombre: string; ref: Ref }[] = [
  { nombre: 'Óxido', ref: [1, 1] },
  { nombre: 'Cobre', ref: [1, 2] },
  { nombre: 'Plata', ref: [1, 3] },
  { nombre: 'Cobalto', ref: [1, 4] },
  { nombre: 'Obsidiana', ref: [2, 1] },
  { nombre: 'Placa Blanca', ref: [2, 2] },
  { nombre: 'Sin Nombre', ref: [2, 3] },
];

// ---------- Base Colgante ----------

/**
 * Módulos de la Base: por nivel (bajo, medio, máximo), la fila; la columna sale de la corriente
 * (N, S, A) cuando la hoja trae una por corriente. `icon` = icono para los paneles.
 */
export interface BuildingArt {
  sheet: string;
  levels: number[];
  /** Columnas por corriente (si no, se alternan las de la fila como luz que parpadea). */
  cols?: Record<Corriente, number>;
  icon?: Ref;
}
const NSA = { N: 1, S: 2, A: 3 };
export const BUILDING_ART: Record<string, BuildingArt> = {
  montacargas: { sheet: 'montacargas', levels: [1, 1, 1], icon: [2, 1] },
  almacen: { sheet: 'almacen-de-chatarra', levels: [1, 1, 2], icon: [2, 4] },
  generador: { sheet: 'generador-de-cable', levels: [1, 2, 2], icon: [3, 1] },
  barracon: { sheet: 'barracon-colgante', levels: [1, 2, 3], icon: [4, 1] },
  enfermeria: { sheet: 'enfermeria-de-lona', levels: [1, 2, 3], icon: [4, 3] },
  mercado: { sheet: 'mercado-de-la-pasarela', levels: [1, 2, 3], icon: [4, 2] },
  camara: { sheet: 'camara-de-descompresion', levels: [1, 2, 3], icon: [4, 3] },
  fragua: { sheet: 'fragua-suspendida', levels: [1, 2, 3], icon: [4, 1] },
  taller_placas: { sheet: 'taller-de-placas', levels: [1, 2, 3], icon: [4, 3] },
  taller_lentes: { sheet: 'taller-de-lentes', levels: [1, 2, 3], icon: [4, 3] },
  destileria: { sheet: 'destileria-de-esencia', levels: [1, 2, 3], icon: [4, 3] },
  criadero: { sheet: 'criadero-de-nidos', levels: [1, 3, 5], cols: NSA, icon: [6, 1] },
  taberna: { sheet: 'taberna-del-ultimo-peldano', levels: [1, 2, 3], cols: NSA },
  santuario: { sheet: 'santuario-del-cable', levels: [1, 2, 4], cols: NSA, icon: [7, 3] },
  osario: { sheet: 'osario-de-ecos', levels: [1, 2, 3], cols: NSA, icon: [1, 4] },
  torre_vigia: { sheet: 'torre-de-vigia', levels: [1, 2, 4], cols: NSA, icon: [5, 1] },
  biblioteca: { sheet: 'biblioteca-colgante', levels: [3, 1, 2], cols: NSA, icon: [1, 4] },
  sonda: { sheet: 'sonda-del-vacio', levels: [1, 3, 5], cols: NSA, icon: [6, 1] },
  ancla: { sheet: 'ancla-del-abismo', levels: [1, 3, 5], cols: NSA, icon: [5, 4] },
  forja_honda: { sheet: 'forja-del-fondo', levels: [1, 3, 4], cols: NSA, icon: [3, 4] },
  faro: { sheet: 'faro-de-lo-hondo', levels: [1, 2, 3], cols: NSA, icon: [1, 4] },
};

/** Equipo fabricado en los talleres: iconos por ranura (arma, armadura, accesorio). */
export const EQUIP_SHEET = 'equipo-fabricado';
export const EQUIP_ICON: Record<string, Ref[]> = {
  arma: R(1, 1, 2, 3, 4),
  armadura: R(4, 5, 6, 7, 8),
  accesorio: R(4, 1, 2, 3, 4),
};

// ---------- escenarios ----------

/** Fondo de cada capa (0–3) por corriente; Lo Hondo por sub-capa. */
export const ERA_SCENERY: Record<Corriente, string>[] = [
  { N: 'el-brocal-neon', S: 'el-brocal-sintetica', A: 'el-brocal-abismal' },
  { N: 'los-andamios-neon', S: 'los-andamios-sintetica', A: 'los-andamios-abismal' },
  { N: 'el-bosque-invertido-neon', S: 'el-bosque-invertido-sintetica', A: 'el-bosque-invertido-abismal' },
  { N: 'la-necropolis-neon', S: 'la-necropolis-sintetica', A: 'la-necropolis-abismal' },
];
export const SUB_SCENERY: Record<string, string> = {
  'El Mar de Mercurio': 'el-mar-de-mercurio',
  'La Catedral de Estática': 'la-catedral-de-estatica',
  'El Jardín que Respira': 'el-jardin-que-respira',
  'La Zona Sin Gravedad': 'la-zona-sin-gravedad',
  'El Archivo de los Ahogados': 'el-archivo-de-los-ahogados',
  'La Fábrica de Capas': 'la-fabrica-de-capas',
  'Los Huesos del Gigante': 'los-huesos-del-gigante',
  'La Ciudad Original': 'la-ciudad-original',
  'El Latido': 'el-latido',
  'La Frontera de Ruido': 'la-frontera-de-ruido',
  'El Fondo': 'el-fondo',
};
export const SCENERY_START = 'el-borde-de-la-grieta';
export const SCENERY_HONDO = 'lo-hondo-siluetas-gigantes';
export const SCENERY_CICLO = 'ciclos-invertidos';

/** Comprueba en desarrollo que todas las hojas citadas existen en el manifiesto. */
export function missingSheets(): string[] {
  const all = [
    ...Object.values(HERO), HERO_AYER, ...Object.values(CHASSIS_ART), ...Object.values(COMPANION_ART), ...Object.values(PET_ART),
    ...Object.values(FAMILY_ART), ...ERA_BOSS_ART.flatMap((x) => Object.values(x)), ...Object.values(UMBRAL_MENOR_ART), COSTILLA_ART,
    ...CICLO_ART, ...Object.values(ELITE_ART), ...Object.values(NPC_ART), ...Object.values(CHAIN_NPC_ART),
  ].map((d) => d.sheet);
  const more = [
    ...Object.values(EVENT_ICON).map((x) => x[0]), MOD_SHEET, MUT_SHEET, SYN_SHEET, PLACA_SHEET, EQUIP_SHEET,
    ...Object.values(BUILDING_ART).map((b) => b.sheet), ...ERA_SCENERY.flatMap((x) => Object.values(x)), ...Object.values(SUB_SCENERY),
    SCENERY_START, SCENERY_HONDO, SCENERY_CICLO,
  ];
  return [...new Set([...all, ...more])].filter((id) => !hasSheet(id));
}
