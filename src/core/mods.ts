// Modificadores de la build. Cada carta, compañero o sinergia aporta `Efectos` (datos);
// la simulación solo lee el resultado combinado (`Mods`).
export const BASE_MODS = {
  // multiplicadores (se multiplican entre sí)
  ataqueMult: 1,
  vidaMult: 1,
  velAtaqueMult: 1,
  regenMult: 1,
  alcanceMult: 1,
  velocidadMult: 1,
  oroMult: 1,
  criaturaVidaMult: 1,
  criaturaAtkMult: 1,
  criaturaOroMult: 1,
  /** Producción de la Base. */
  produccionMult: 1,
  /** Coste de las mejoras del héroe. */
  costeMejorasMult: 1,
  /** Botín de monedas de era (esencia, ecos…) que sueltan los Umbrales. */
  umbralBotinMult: 1,
  ecosMult: 1,
  /** La Presión base se multiplica por esto. */
  presionMult: 1,
  // aditivos (se suman)
  criticoAdd: 0,
  danoCriticoAdd: 0,
  defensaAdd: 0,
  /** Fracción de la vida máxima que se cura al matar. */
  curaAlMatar: 0,
  /** Fracción del daño recibido que se devuelve al atacante. */
  reflejo: 0,
  /** Probabilidad de botín doble. */
  dobleBotin: 0,
  /** Daño por segundo al objetivo, como fracción del ataque. */
  veneno: 0,
  /** Al morir, una criatura daña a la siguiente con esta fracción de su vida máxima. */
  explosion: 0,
  /** Fracción en que se ralentizan los ataques enemigos. */
  lentitud: 0,
  /** Daño extra (fracción) de cada 5.º golpe. */
  golpeFuerte: 0,
  criaturasExtra: 0,
  /** Puntos de Presión sumados (o restados) a la del tramo. */
  presionAdd: 0,
  /** > 0: la Presión aumenta el daño en vez de reducirlo. */
  presionInvertida: 0,
};

export type Mods = { -readonly [K in keyof typeof BASE_MODS]: number };
export type Efectos = Partial<Mods>;

export const GOLPE_FUERTE_CADA = 5;

export function combineEfectos(list: Efectos[]): Mods {
  const m: Mods = { ...BASE_MODS };
  for (const e of list) {
    for (const k of Object.keys(e) as (keyof Mods)[]) {
      if (k.endsWith('Mult')) m[k] *= e[k]!;
      else m[k] += e[k]!;
    }
  }
  m.lentitud = Math.min(0.6, m.lentitud);
  m.dobleBotin = Math.min(1, m.dobleBotin);
  return m;
}

/** Efecto por nivel → efecto total: los multiplicadores se elevan al nivel; los aditivos se multiplican. */
export function scaleEfectos(e: Efectos, n: number): Efectos {
  const out: Efectos = {};
  for (const k of Object.keys(e) as (keyof Mods)[]) out[k] = k.endsWith('Mult') ? Math.pow(e[k]!, n) : e[k]! * n;
  return out;
}

const pct = (v: number) => `${v >= 1 ? '+' : '−'}${Math.abs(Math.round((v - 1) * 100))} %`;
const frac = (v: number) => `${Math.round(v * 100)} %`;

const TEXT: { [K in keyof Mods]: (v: number) => string } = {
  ataqueMult: (v) => `${pct(v)} de ataque`,
  vidaMult: (v) => `${pct(v)} de vida`,
  velAtaqueMult: (v) => `${pct(v)} de velocidad de ataque`,
  regenMult: (v) => (v === 0 ? 'Sin regeneración' : `${pct(v)} de regeneración`),
  alcanceMult: (v) => `${pct(v)} de alcance`,
  velocidadMult: (v) => `${pct(v)} de velocidad de carrera`,
  oroMult: (v) => `${pct(v)} de moneda`,
  criaturaVidaMult: (v) => `Criaturas con ${pct(v)} de vida`,
  criaturaAtkMult: (v) => (v === 0 ? 'Las criaturas no atacan' : `Criaturas con ${pct(v)} de ataque`),
  criaturaOroMult: (v) => `Las criaturas sueltan ${pct(v)} de moneda`,
  produccionMult: (v) => `${pct(v)} de producción de la Base`,
  costeMejorasMult: (v) => `Las mejoras del héroe cuestan ${pct(v)}`,
  umbralBotinMult: (v) => (v === 0 ? 'Los Umbrales no sueltan botín de era' : `${pct(v)} de botín de los Umbrales`),
  ecosMult: (v) => `${pct(v)} de Ecos`,
  presionMult: (v) => `Presión ${pct(v)}`,
  criticoAdd: (v) => `${v >= 0 ? '+' : '−'}${frac(Math.abs(v))} de crítico`,
  danoCriticoAdd: (v) => `+${v.toFixed(1)} al daño crítico`,
  defensaAdd: (v) => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v))} de defensa`,
  curaAlMatar: (v) => `Cura un ${frac(v)} de la vida al matar`,
  reflejo: (v) => `Refleja el ${frac(v)} del daño recibido`,
  dobleBotin: (v) => `${frac(v)} de probabilidad de botín doble`,
  veneno: (v) => `Envenena: ${frac(v)} del ataque por segundo`,
  explosion: (v) => `Las criaturas explotan al morir (${frac(v)} de su vida a la siguiente)`,
  lentitud: (v) => `Los enemigos atacan un ${frac(v)} más lento`,
  golpeFuerte: (v) => `Cada ${GOLPE_FUERTE_CADA}.º golpe hace ×${(1 + v).toFixed(0)} de daño`,
  criaturasExtra: (v) => `+${v} criaturas por tramo`,
  presionAdd: (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v)} de Presión`,
  presionInvertida: () => 'La Presión aumenta tu daño en vez de reducirlo',
};

/** Líneas de texto (español) que describen unos efectos; para cartas y paneles. */
export function describeEfectos(e: Efectos): string[] {
  return (Object.keys(e) as (keyof Mods)[]).map((k) => TEXT[k](e[k]!));
}
