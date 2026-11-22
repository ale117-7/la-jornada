// Modificadores de criaturas: cada criatura = familia + 0–3 modificadores + escala por tramo.
export interface ModifierDef {
  id: string;
  /** Adjetivo en masculino y femenino (concuerda con la familia). */
  adj: [string, string];
  /** Tramo desde el que puede aparecer (modificadores normales). */
  zonaMin?: number;
  /** Hora trabajada desde la que puede aparecer (modificadores de Anomalía, solo en Lo Hondo). */
  horaMin?: number;
  hp: number;
  atk: number;
  oro: number;
  color: string;
  peso?: number;
  /** El intervalo de ataque se multiplica por esto (< 1 = más rápido). */
  intervalo?: number;
  /** Al morir daña al héroe. */
  explota?: boolean;
  /** Al morir se parte en 2. */
  divide?: boolean;
  /** Se dibuja más grande. */
  grande?: boolean;
}

const m = (id: string, masc: string, fem: string, zonaMin: number, hp: number, atk: number, oro: number, color: string, extra: Partial<ModifierDef> = {}): ModifierDef => ({
  id, adj: [masc, fem], zonaMin, hp, atk, oro, color, ...extra,
});
const a = (id: string, masc: string, fem: string, horaMin: number, hp: number, atk: number, oro: number, color: string, extra: Partial<ModifierDef> = {}): ModifierDef => ({
  id, adj: [masc, fem], horaMin, hp, atk, oro, color, ...extra,
});

export const MODIFIERS: ModifierDef[] = [
  m('gigante', 'Gigante', 'Gigante', 3, 2.0, 1.2, 2.2, '#ffffff', { grande: true }),
  m('veloz', 'Veloz', 'Veloz', 4, 0.9, 1.0, 1.2, '#7ff0f0', { intervalo: 0.7 }),
  m('venenoso', 'Venenoso', 'Venenosa', 6, 1.0, 1.3, 1.4, '#9be03f'),
  m('acorazado', 'Acorazado', 'Acorazada', 8, 1.8, 1.0, 1.6, '#9aa5ba'),
  m('explosivo', 'Explosivo', 'Explosiva', 10, 0.9, 1.0, 1.5, '#ff7a3f', { explota: true }),
  m('cristalino', 'Cristalino', 'Cristalina', 12, 1.2, 1.15, 1.5, '#b6f5ff'),
  m('regenerador', 'Regenerador', 'Regeneradora', 14, 1.5, 1.0, 1.5, '#5ae08a'),
  m('divisor', 'Divisor', 'Divisora', 16, 1.0, 1.0, 1.3, '#e03fe0', { divide: true }),
  m('dorado', 'Dorado', 'Dorada', 18, 0.8, 0.6, 8, '#ffd24a', { peso: 0.25 }),
  m('ancestral', 'Ancestral', 'Ancestral', 22, 2.2, 1.5, 3, '#c9b27a', { grande: true }),
  m('mutado', 'Mutado', 'Mutada', 26, 1.3, 1.3, 1.8, '#c77dff'),
  m('oxidado', 'Oxidado', 'Oxidada', 30, 0.8, 0.9, 1.0, '#b5651d'),
  m('blindado', 'Blindado', 'Blindada', 34, 2.4, 0.9, 2.0, '#5c6b8a'),
  m('furioso', 'Furioso', 'Furiosa', 38, 1.0, 1.6, 1.8, '#ff4040'),
  m('fantasmal', 'Fantasmal', 'Fantasmal', 42, 0.7, 1.4, 1.7, '#d7deea'),
  m('electrico', 'Eléctrico', 'Eléctrica', 46, 1.1, 1.4, 1.8, '#fff36b'),
  m('espinoso', 'Espinoso', 'Espinosa', 50, 1.4, 1.2, 1.7, '#6fae4f'),
  m('voraz', 'Voraz', 'Voraz', 56, 1.6, 1.4, 2.2, '#e0623f'),
  m('sombrio', 'Sombrío', 'Sombría', 62, 1.2, 1.5, 2.0, '#6b4fa0'),
  m('luminoso', 'Luminoso', 'Luminosa', 68, 1.3, 1.1, 2.4, '#fff7c2'),
  m('colosal', 'Colosal', 'Colosal', 76, 3.0, 1.4, 3.5, '#ffb347', { grande: true }),
  m('frenetico', 'Frenético', 'Frenética', 84, 0.9, 1.2, 1.6, '#ff3fa4', { intervalo: 0.5 }),
  m('petrificado', 'Petrificado', 'Petrificada', 92, 3.2, 0.8, 2.6, '#8a8f99'),
  m('hambriento', 'Hambriento', 'Hambrienta', 100, 1.5, 1.7, 2.6, '#a03f3f'),
  m('errante', 'Errante', 'Errante', 110, 1.2, 1.2, 2.0, '#3fe0b0'),
  // Anomalías: exclusivas de las Horas Extra (Lo Hondo); aparece una nueva cada cierto tiempo.
  a('invertido', 'Invertido', 'Invertida', 5, 2.0, 1.5, 4, '#3fe0e6'),
  a('sin_sombra', 'Sin Sombra', 'Sin Sombra', 5.5, 1.6, 1.8, 4, '#f2f2f2'),
  a('duplicado', 'Duplicado', 'Duplicada', 6, 1.5, 1.4, 4, '#ff3fa4', { divide: true }),
  a('resonante', 'Resonante', 'Resonante', 7, 2.4, 1.6, 5, '#b6ff3f', { explota: true }),
  a('hueco', 'Hueco', 'Hueca', 8, 3.0, 1.5, 5, '#39425a'),
  a('imposible', 'Imposible', 'Imposible', 9, 2.6, 2.0, 6, '#c77dff', { intervalo: 0.6 }),
  a('reescrito', 'Reescrito', 'Reescrita', 10, 3.4, 1.9, 7, '#ffd24a', { grande: true }),
  a('sin_nombre', 'Sin Nombre', 'Sin Nombre', 11, 4.0, 2.2, 8, '#ffffff', { grande: true }),
];

export const MODIFIER_BY_ID = Object.fromEntries(MODIFIERS.map((x) => [x.id, x]));
