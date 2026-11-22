// Artefactos (reliquias): objetos hallados en las paredes de la Grieta. Texto de catálogo de museo.
import type { Efectos } from '../core/mods';
import type { Corriente, Rareza, Tag } from './tags';

export interface RelicDef {
  id: string;
  nombre: string;
  corriente: Corriente;
  grado: Rareza;
  etiqueta: Tag;
  efectos: Efectos;
  texto: string;
}

const r = (id: string, nombre: string, corriente: Corriente, grado: Rareza, etiqueta: Tag, efectos: Efectos, texto: string): RelicDef => ({ id, nombre, corriente, grado, etiqueta, efectos, texto });

export const RELICS: RelicDef[] = [
  // Neón
  r('brujula_sin_norte', 'Brújula Sin Norte', 'N', 'Rara', 'Mecánico', { velocidadMult: 1.15 }, 'Siempre apunta hacia abajo.'),
  r('moneda_dos_caras', 'Moneda de Dos Caras Iguales', 'N', 'Común', 'Sombra', { dobleBotin: 0.08 }, 'Acuñada por nadie. Siempre sale lo mismo.'),
  r('cable_vivo', 'Cable Vivo', 'N', 'Común', 'Mecánico', { velAtaqueMult: 1.08 }, 'Se enrosca en la muñeca de quien lo sostiene.'),
  r('paraguas_roto', 'Paraguas Roto del Mercader', 'N', 'Común', 'Marino', { defensaAdd: 12 }, 'No para la lluvia. Para otras cosas.'),
  r('lente_seguridad', 'Lente de Cámara de Seguridad', 'N', 'Rara', 'Arcano', { criticoAdd: 0.07 }, 'Sigue grabando. No se sabe para quién.'),
  r('bateria_ilegal', 'Batería Ilegal', 'N', 'Rara', 'Fuego', { ataqueMult: 1.15 }, 'Etiqueta arrancada. Zumba en la oscuridad.'),
  r('mascara_chatarrero', 'Máscara de Chatarrero', 'N', 'Común', 'Veneno', { vidaMult: 1.1 }, 'Filtra el aire y los recuerdos.'),
  r('holograma_roto', 'Holograma Roto', 'N', 'Épica', 'Sombra', { reflejo: 0.2, criticoAdd: 0.05 }, 'Anuncia un producto que nunca existió.'),
  r('llave_maestra', 'Llave Maestra del Brocal', 'N', 'Épica', 'Sombra', { oroMult: 1.3 }, 'Abre lo que estaba cerrado por una razón.'),
  r('corona_espinas', 'Corona de Espinas de Cobre', 'N', 'Legendaria', 'Fuego', { ataqueMult: 1.5, vidaMult: 0.85, oroMult: 1.2 }, 'Quien la lleva recibe más daño. Cada golpe, sin embargo, paga.'),
  // Sintética
  r('regla_infinita', 'Regla Infinita', 'S', 'Común', 'Cristal', { defensaAdd: 10 }, 'Mide exactamente lo que falta por bajar.'),
  r('cuerpo_de_bolsillo', 'Cuerpo de Bolsillo', 'S', 'Rara', 'Hielo', { vidaMult: 1.18 }, 'Repuesto compacto. Talla única.'),
  r('senal_de_salida', 'Señal de Salida', 'S', 'Común', 'Arcano', { velocidadMult: 1.08 }, 'Indica una salida que no figura en los planos.'),
  r('prisma_menor', 'Prisma Menor', 'S', 'Común', 'Cristal', { reflejo: 0.1 }, 'Devuelve la luz ligeramente cambiada.'),
  r('manual_sin_texto', 'Manual Sin Texto', 'S', 'Rara', 'Arcano', { danoCriticoAdd: 0.4 }, 'Sus páginas en blanco se leen solas.'),
  r('reloj_de_obra', 'Reloj de Obra', 'S', 'Rara', 'Mecánico', { produccionMult: 1.2 }, 'Marca el final de una jornada que no termina.'),
  r('centinela_dormido', 'Centinela Dormido', 'S', 'Épica', 'Cristal', { defensaAdd: 25, reflejo: 0.15 }, 'Cabe en la palma. Sueña con vigilar.'),
  r('glitch_embotellado', 'Glitch Embotellado', 'S', 'Épica', 'Arcano', { golpeFuerte: 2 }, 'Agítese antes de usar. O no.'),
  r('plano_original', 'Plano Original', 'S', 'Rara', 'Hielo', { lentitud: 0.12 }, 'Dibuja un edificio que todavía no se ha caído.'),
  r('interruptor_maestro', 'Interruptor Maestro', 'S', 'Legendaria', 'Mecánico', { velAtaqueMult: 1.35, golpeFuerte: 1.5 }, 'Solo tiene una posición: encendido.'),
  // Abismal
  r('semilla_dormida', 'Semilla Dormida', 'A', 'Común', 'Bestia', { regenMult: 1.25 }, 'Late si se la acerca al oído.'),
  r('pluma_de_garza', 'Pluma de Garza del Vacío', 'A', 'Común', 'Bestia', { velocidadMult: 1.1 }, 'Cae más despacio de lo que debería.'),
  r('lirio_prensado', 'Lirio Prensado', 'A', 'Rara', 'Veneno', { veneno: 0.25 }, 'Conservado entre dos placas. Aún muerde.'),
  r('concha_de_eco', 'Concha de Eco', 'A', 'Común', 'Marino', { oroMult: 1.1 }, 'Dentro se oye otro abismo.'),
  r('musgo_luminoso', 'Musgo Luminoso', 'A', 'Común', 'Sagrado', { curaAlMatar: 0.03 }, 'Crece sobre las heridas, si se le deja.'),
  r('huevo_de_ceniza', 'Huevo de Ceniza', 'A', 'Rara', 'Fuego', { explosion: 0.2 }, 'Templado. No se recomienda incubarlo.'),
  r('lagrima_del_arbol', 'Lágrima del Árbol Madre', 'A', 'Épica', 'Sagrado', { vidaMult: 1.25, regenMult: 1.3 }, 'Resina antigua. Dentro, algo se mueve.'),
  r('colmillo_antiguo', 'Colmillo Antiguo', 'A', 'Rara', 'Bestia', { criticoAdd: 0.06, danoCriticoAdd: 0.3 }, 'De un animal que no dejó más restos.'),
  r('agua_que_sube', 'Agua que Sube', 'A', 'Épica', 'Marino', { regenMult: 1.6, dobleBotin: 0.08 }, 'Un frasco que se vacía hacia arriba.'),
  r('corazon_de_relicario', 'Corazón de Relicario', 'A', 'Legendaria', 'Sagrado', { curaAlMatar: 0.12, vidaMult: 1.3 }, 'Lo guardaba un cangrejo. Lo guardaba bien.'),
];

export const RELIC_BY_ID = Object.fromEntries(RELICS.map((x) => [x.id, x]));
export const GRADO_NUM: Record<Rareza, number> = { Común: 1, Rara: 2, Épica: 3, Legendaria: 4 };
