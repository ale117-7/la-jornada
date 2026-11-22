// Catálogo de eventos aleatorios (EVENTOS_Y_RUTA.md §4). Cada 8–20 min trabajados ocurre uno.
import { artefacto, azar, buff, despues, elite, NADA, oro, perm, tramos, varios, type Efx } from './efx';
import type { Corriente } from './tags';

export type EventCategory = 'Encuentros' | 'Clima y capa' | 'Base Colgante' | 'Compañeros' | 'Tesoros' | 'Peligros' | 'Rarezas';

export interface EventDef {
  id: string;
  nombre: string;
  categoria: EventCategory;
  corriente: Corriente | '*';
  /** Era mínima (1–5). */
  eraMin: number;
  peso: number;
  /** ★: una sola vez por día. */
  unaVezPorDia?: boolean;
  /** Evento de capa (Era IV+, dura 10–15 min). */
  capa?: boolean;
  /** Necesita al menos un compañero en el grupo. */
  requiereCompanero?: boolean;
  /** Tipo de mercader/clima, para las condiciones del día. */
  clase?: 'mercader' | 'clima';
  efecto: Efx;
  textoLog: string;
}

type Opt = Partial<Pick<EventDef, 'peso' | 'unaVezPorDia' | 'capa' | 'requiereCompanero' | 'clase'>>;
const ev = (id: string, nombre: string, categoria: EventCategory, corriente: Corriente | '*', eraMin: number, efecto: Efx, textoLog: string, o: Opt = {}): EventDef => ({
  id, nombre, categoria, corriente, eraMin, peso: 1, efecto, textoLog, ...o,
});

const E = 'Encuentros', C = 'Clima y capa', B = 'Base Colgante', P = 'Compañeros', T = 'Tesoros', D = 'Peligros';

export const EVENTS: EventDef[] = [
  // ---- 4.1 Encuentros ----
  ev('mercader_paraguas', 'Mercader de Paraguas', E, 'N', 1, buff(3, { costeMejorasMult: 0.5 }), 'Bajo su paraguas, todo a mitad de precio. El Descensor compra sin regatear.', { clase: 'mercader' }),
  ev('descensor_perdido', 'Descensor Perdido', E, '*', 1, buff(10, { ataqueMult: 1.25 }), 'Un Descensor sin expedición camina con el grupo durante 10 min.'),
  ev('criatura_dorada', 'Criatura Dorada', E, '*', 1, elite('Criatura Dorada', 2, 0.3, oro(20)), 'Algo dorado corre por la cornisa. Si cae, deja una fortuna.'),
  ev('nina_farol', 'La Niña del Farol', E, 'A', 2, buff(10, { criticoAdd: 0.15 }, 'brillo'), 'Una niña con un farol alumbra el camino: se ve dónde duele.'),
  ev('cuerpo_repuesto', 'Cuerpo de Repuesto', E, 'S', 2, azar(0.5, perm({ vidaMult: 1.1 }), perm({ ataqueMult: 1.1 })), 'El Descensor cambia de cuerpo. Este le queda un poco mejor.'),
  ev('predicador', 'Predicador del Borde', E, 'N', 2, azar(0.5, buff(15, { ataqueMult: 1.3 }), buff(15, { ataqueMult: 0.85 })), 'El Predicador del Borde grita una bendición. O una maldición. Cuesta distinguirlas.'),
  ev('expedicion_rival', 'Expedición Rival', E, '*', 2, varios(buff(5, { velocidadMult: 1.3 }), despues(5, azar(0.6, artefacto(), NADA), 'La carrera contra la expedición rival termina.')), 'Otra expedición baja a la par. Nadie quiere llegar segundo.'),
  ev('eco_caido', 'Eco de un Descensor Caído', E, '*', 3, buff(15, { ataqueMult: 1.4 }), 'Un fantasma pelea a tu lado. Deja su placa: alguien la recordará.', { unaVezPorDia: true }),
  ev('coleccionista', 'El Coleccionista sin Rostro', E, 'S', 3, artefacto(2), 'El Coleccionista sin Rostro examina tu bolsa y deja algo mejor.'),
  ev('manada', 'Manada Migratoria', E, 'A', 3, buff(3, { velocidadMult: 4, criaturaVidaMult: 0.02 }), 'Una manada baja en estampida. El Descensor corre sobre sus lomos.'),
  ev('contrabandista', 'Contrabandista de Recuerdos', E, 'N', 3, { t: 'flag', id: 'revelaOculto' }, 'Un contrabandista te vende un recuerdo ajeno: sabrás qué esconde la próxima carta ???.', { clase: 'mercader' }),
  ev('gigante_dormido', 'El Gigante Dormido', E, 'A', 4, azar(0.3, elite('El Gigante Dormido', 60, 3, varios(oro(60), { t: 'moneda', id: 'ecos', n: 20 })), tramos(1)), 'El camino pasa sobre un cuerpo inmenso que respira despacio.', { unaVezPorDia: true }),
  ev('archivista', 'La Archivista', E, 'S', 4, { t: 'combo' }, 'La Archivista te deja leer una ficha: dos etiquetas que, juntas, hacen algo más.'),
  ev('mapas_falsos', 'Vendedor de Mapas Falsos', E, 'N', 2, azar(0.5, tramos(5), buff(5, { criaturasExtra: 4 })), 'Compras un mapa. Puede que sea un atajo. Puede que no.', { clase: 'mercader' }),
  ev('ermitano', 'Ermitaño de la Pared', E, 'A', 3, buff(20, { golpeFuerte: 2 }), 'Un ermitaño colgado de la roca enseña un golpe que casi nadie recuerda.'),

  // ---- 4.2 Clima y capa ----
  ev('lluvia_acida', 'Lluvia Ácida', C, 'N', 1, buff(8, { defensaAdd: -10, criaturaVidaMult: 0.9 }, 'lluvia'), 'Llueve ácido. Todo se ablanda: armaduras, chapas, pieles.', { clase: 'clima' }),
  ev('niebla_viva', 'Niebla Viva', C, 'A', 1, buff(8, { criaturaOroMult: 1.4 }, 'niebla'), 'La niebla se mueve sola. Las criaturas aparecen de golpe, cargadas de botín.', { clase: 'clima' }),
  ev('apagon', 'Apagón', C, 'N', 2, buff(8, { criaturaAtkMult: 1.15, oroMult: 1.3 }, 'oscuro'), 'Apagón. Solo se ven ojos y neón.', { clase: 'clima' }),
  ev('lluvia_ascendente', 'Lluvia Ascendente', C, 'A', 2, buff(10, { regenMult: 2 }, 'lluvia'), 'Las gotas suben desde el fondo. Lo que tocan, se cierra.', { clase: 'clima' }),
  ev('corte_senal', 'Corte de Señal', C, 'S', 2, varios(buff(2, { velAtaqueMult: 0.7 }), despues(2, buff(2, { velAtaqueMult: 2 }), 'Vuelve la señal: sobrecarga.')), 'Corte de señal: el cuerpo responde tarde.', { clase: 'clima' }),
  ev('tormenta_esporas', 'Tormenta de Esporas', C, 'A', 3, varios(buff(10, { presionAdd: 15 }, 'niebla'), { t: 'moneda', id: 'esencia', n: 25 }), 'Tormenta de esporas: el aire pesa y brilla.', { clase: 'clima' }),
  ev('silencio_absoluto', 'Silencio Absoluto', C, 'S', 3, buff(6, { criaturaAtkMult: 1.1, criticoAdd: 0.05 }, 'oscuro'), 'Silencio absoluto. Las criaturas no se ven hasta que golpean.', { clase: 'clima' }),
  ev('eclipse_neon', 'Eclipse de Neón', C, 'N', 4, buff(12, { criaturasExtra: 3, criaturaOroMult: 2 }, 'oscuro'), 'Eclipse de Neón: los hologramas cobran vida y atacan.', { capa: true, clase: 'clima' }),
  ev('marea_estatica', 'Marea de Estática', C, 'S', 4, buff(12, { criaturasExtra: 4, criaturaOroMult: 1.5 }, 'brillo'), 'Marea de Estática: todo brilla y se duplica.', { capa: true, clase: 'clima' }),
  ev('luna_interior', 'Luna Interior', C, 'A', 4, buff(15, { dobleBotin: 0.25 }, 'brillo'), 'Algo brilla en el fondo, como una luna vista desde arriba.', { capa: true, clase: 'clima' }),
  ev('nieve_ceniza', 'Nieve de Ceniza', C, '*', 2, buff(10, { velocidadMult: 0.8, produccionMult: 2 }, 'niebla'), 'Nieva ceniza. Todo va más lento, menos la Base.', { clase: 'clima' }),
  ev('viento_fondo', 'Viento del Fondo', C, '*', 3, tramos(2), 'Un viento sube desde abajo… y luego tira. El Descensor baja dos tramos de golpe.', { clase: 'clima' }),
  ev('lluvia_chatarra', 'Lluvia de Chatarra', C, '*', 1, varios(oro(8), buff(3, { criaturaVidaMult: 0.9 })), 'Cae chatarra de la ciudad. Algo de ella vale.', { clase: 'clima' }),

  // ---- 4.3 Base Colgante ----
  ev('festival_base', 'Festival de la Base', B, '*', 2, buff(15, { produccionMult: 1.5 }, 'brillo'), 'Luces y banderines en la Base: festival.'),
  ev('sabotaje', 'Sabotaje', B, 'N', 2, varios(buff(10, { produccionMult: 0.6 }), despues(10, perm({ produccionMult: 1.1 }), 'El módulo saboteado vuelve, mejor de lo que era.')), 'Sabotaje: un módulo de la Base se apaga.'),
  ev('cable_roto', 'Cable Roto', B, '*', 2, tramos(1), 'Un cable cede. La Base cae un tramo entero y se queda ahí, temblando.'),
  ev('nacimiento', 'Nacimiento', B, 'A', 3, { t: 'mascota' }, 'Algo rompe el cascarón en la Base.'),
  ev('suministros', 'Suministros de Arriba', B, '*', 2, { t: 'moneda', id: 'materiales', n: 60 }, 'Baja una cápsula con Materiales. Alguien arriba aún se acuerda.'),
  ev('plaga_oxido', 'Plaga de Óxido', B, 'N', 3, buff(8, { produccionMult: 0.7 }), 'Óxido en los cables. El Taller tardará en limpiarlo.'),
  ev('inventor', 'El Inventor', B, '*', 3, buff(60, { velAtaqueMult: 1.15, produccionMult: 1.2 }), 'Un inventor instala un módulo experimental. Durará una hora, dice.'),
  ev('refugiados', 'Visitantes Refugiados', B, '*', 4, perm({ produccionMult: 1.15 }), 'Llegan refugiados a la Base. Se quedan y trabajan.'),
  ev('antena', 'Antena Improvisada', B, 'S', 3, { t: 'flag', id: 'anuncioTemprano' }, 'Una antena improvisada: la próxima Encrucijada se anunciará antes.'),

  // ---- 4.4 Compañeros ----
  ev('discusion', 'Discusión', P, '*', 2, varios(buff(5, { ataqueMult: 0.9 }), despues(5, perm({ ataqueMult: 1.1 }), 'Se reconcilian. Pelean mejor que antes.')), 'Discusión en el grupo. Nadie se habla.', { requiereCompanero: true }),
  ev('juramento', 'Juramento', P, '*', 3, perm({ golpeFuerte: 1 }), 'Un juramento junto al vacío: nace un ataque combinado.', { requiereCompanero: true }),
  ev('sueno_compartido', 'Sueño Compartido', P, 'A', 3, { t: 'flag', id: 'presagio' }, 'El grupo sueña lo mismo: lo que hay más abajo.', { requiereCompanero: true }),
  ev('mutacion_espontanea', 'Mutación Espontánea', P, '*', 3, { t: 'mutacion' }, 'Algo cambia en el cuerpo de un compañero. Y en el tuyo.', { requiereCompanero: true }),
  ev('traicion', 'La Traición', P, 'N', 4, varios(oro(-30), buff(60, { ataqueMult: 0.9 }), despues(60, varios({ t: 'evolucionar' }, oro(60)), 'Vuelve quien te robó. Pide perdón. Ha cambiado.')), 'Un compañero roba la bolsa y desaparece en la niebla.', { unaVezPorDia: true, requiereCompanero: true }),
  ev('leccion', 'Lección', P, '*', 2, perm({ vidaMult: 1.05, ataqueMult: 1.05 }), 'El veterano del grupo enseña lo que sabe.', { requiereCompanero: true }),
  ev('nostalgia', 'Nostalgia', P, '*', 4, perm({ criticoAdd: 0.03 }), 'Un compañero cuenta de dónde viene. Nadie le interrumpe.', { requiereCompanero: true }),

  // ---- 4.5 Tesoros ----
  ev('cofre_sellado', 'Cofre Sellado', T, '*', 1, azar(0.75, oro(12), artefacto()), 'Un cofre sellado, encajado en la roca.'),
  ev('capsula_tiempo', 'Cápsula del Tiempo', T, 'S', 2, artefacto(2), 'Una cápsula del tiempo. Dentro, algo que no debería existir todavía.'),
  ev('bolsillo_esporas', 'Bolsillo de Esporas', T, 'A', 2, { t: 'moneda', id: 'esencia', n: 40 }, 'Un bolsillo de esporas revienta en luz.'),
  ev('caja_negra', 'Caja Negra', T, 'N', 3, varios(oro(25), { t: 'lore' }), 'Una caja negra. Aún guarda una voz.'),
  ev('mapa_mojado', 'Mapa Mojado', T, '*', 2, { t: 'flag', id: 'cuatroCartas' }, 'Un mapa mojado: la próxima Encrucijada tendrá una carta más.'),
  ev('pieza_mapa', 'Pieza de Mapa', T, '*', 2, { t: 'cadena', id: 'mapa', si_no: oro(10) }, 'Un trozo de mapa, dibujado a mano.'),
  ev('altar', 'Altar Abandonado', T, 'A', 4, varios(oro(-20), buff(60, { ataqueMult: 1.25, vidaMult: 1.25 })), 'El Descensor deja moneda en un altar. Algo responde.'),

  // ---- 4.6 Peligros ----
  ev('emboscada', 'Emboscada', D, '*', 1, buff(4, { criaturasExtra: 6 }), 'Emboscada: salen de todas las grietas.'),
  ev('derrumbe', 'Derrumbe', D, '*', 2, varios({ t: 'pausa', seg: 60 }, artefacto()), 'Derrumbe. Un minuto apartando escombros… y debajo había algo.'),
  ev('cazador', 'Cazador de Descensores', D, 'N', 3, elite('Cazador de Descensores', 25, 2.2, varios(oro(40), artefacto())), 'Alguien os sigue desde hace rato. Ya no se esconde.'),
  ev('depredador_techo', 'Depredador del Techo', D, 'A', 3, elite('Depredador del Techo', 20, 2.5, { t: 'mascota' }), 'Algo cae desde arriba con las garras por delante.'),
  ev('protocolo_purga', 'Protocolo de Purga', D, 'S', 4, buff(10, { criaturasExtra: 5, criaturaAtkMult: 1.15, criaturaOroMult: 1.6 }, 'sangre'), 'PROTOCOLO DE PURGA. Centinelas en masa.', { capa: true }),
  ev('pico_presion', 'Pico de Presión', D, '*', 4, varios(buff(10, { presionMult: 2 }, 'oscuro'), { t: 'mutacion' }), 'Pico de Presión. Los oídos crujen. Algo muta.', { capa: true }),
  ev('plaga_glitches', 'Plaga de Glitches', D, 'S', 5, buff(10, { criaturasExtra: 4, criaturaOroMult: 2 }, 'glitch'), 'Plaga de glitches: las criaturas se duplican al azar.'),
  ev('marea_negra', 'Marea Negra', D, '*', 5, buff(8, { velocidadMult: 1.4, defensaAdd: -30 }, 'oscuro'), 'El vacío sube por la pared. Hay que correr.'),
  ev('jefe_errante', 'Umbral Errante', D, '*', 2, elite('Umbral Errante', 14, 1.8, oro(50)), 'Un Umbral sin tramo propio vaga por aquí.'),

  // ---- 4.7 Rarezas (≤ 2 % por día cada una) ----
  ev('tren_fantasma', 'El Tren Fantasma', 'Rarezas', '*', 1, tramos(10), 'Un tren iluminado recorre la pared vertical del abismo. El grupo lo aborda.'),
  ev('ballena_niebla', 'La Ballena de Niebla', 'Rarezas', '*', 1, varios({ t: 'pausa', seg: 60 }, buff(10, { ataqueMult: 2, oroMult: 2, produccionMult: 2 }, 'niebla')), 'Una ballena colosal cruza el abismo. Todo se detiene a mirarla.'),
  ev('ciudad_espejo', 'La Ciudad Espejo', 'Rarezas', '*', 1, buff(10, { criaturaOroMult: 3 }, 'espejo'), 'La megaciudad aparece invertida en el vacío. Sus criaturas son reflejos.'),
  ev('telefono_pared', 'El Teléfono de la Pared', 'Rarezas', '*', 1, artefacto(4), 'Un teléfono público suena en la roca. «Sigue bajando», dice alguien, y cuelga.'),
  ev('descensor_ayer', 'El Descensor de Ayer', 'Rarezas', '*', 1, buff(30, { ataqueMult: 1.5 }), 'Tu héroe de ayer corre contigo. No dice nada. Sabe el camino.'),
  ev('lluvia_placas', 'Lluvia de Placas', 'Rarezas', '*', 1, oro(30), 'Caen placas de Descensores olvidados. Se leen nombres: Iria Vento, Tomás Fenn, Ula Dorr.'),
  ev('puerta_pintada', 'La Puerta Pintada', 'Rarezas', '*', 1, buff(10, { criaturaOroMult: 2.5, oroMult: 1.5 }, 'brillo'), 'Una puerta dibujada en la roca se abre. Al otro lado, otra luz.'),
  ev('jardin_relojes', 'El Jardín de Relojes', 'Rarezas', '*', 1, buff(15, { produccionMult: 2 }, 'lento'), 'Un jardín de relojes. Todo va despacio, y sin embargo rinde.'),
  ev('la_mirada', 'La Mirada', 'Rarezas', '*', 1, varios({ t: 'combo' }, perm({ dobleBotin: 0.1 })), 'Un ojo gigante se abre en la pared y te observa. Luego se cierra, satisfecho.'),
  ev('la_cancion', 'La Canción', 'Rarezas', '*', 1, varios(buff(2, { criaturaAtkMult: 0 }), despues(2, buff(20, { ataqueMult: 1.6, vidaMult: 1.4 }), 'La canción termina. Algo de ella se queda.')), 'Las criaturas dejan de pelear y cantan.'),
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const RARITIES = EVENTS.filter((e) => e.categoria === 'Rarezas');

/** Intervalo entre eventos (minutos trabajados) y reglas de selección. */
export const EVENT_RULES = {
  intervaloMin: [8, 20] as [number, number],
  /** No se repite un evento hasta que hayan pasado al menos estos eventos distintos. */
  sinRepetir: 5,
  /** Primer evento garantizado (de Encuentros). */
  primeroMin: 20,
  /** Primer Evento de Capa garantizado. */
  primeraCapaMin: 240,
  /** Si pasan estos minutos sin nada notable (las criaturas nuevas no cuentan), el siguiente evento se adelanta (nunca más de 12 min sin algo que se note). */
  maxSinNovedadMin: 10,
  /** Probabilidad por día de cada rareza. */
  rarezaProb: 0.02,
};
