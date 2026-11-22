// Presagios del día: una frase vaga en la pantalla "Nueva Jornada". Sale de la semilla y da
// una pista (nunca explícita) de la condición del día. Añadir presagios = añadir frases.
import { hashString, nextFloat } from '../core/rng';

/** Frases generales: sirven para cualquier día. */
export const PRESAGIOS: string[] = [
  'Hoy la Grieta suena como un órgano. Algo grande se mueve en la tercera capa.',
  'Las luces del borde parpadean en un orden que nadie programó.',
  'Anoche cayó una moneda por el pozo. Todavía no se ha oído el fondo.',
  'Los cables cantan una nota más grave que ayer.',
  'Alguien dejó una placa de cobre colgada en el primer andamio. No tiene nombre.',
  'El aire que sube huele a hierro mojado y a flores que no existen arriba.',
  'Las aves del borde vuelan hacia abajo. Ninguna vuelve.',
  'Hay niebla dentro de la niebla. Lo de abajo respira despacio.',
  'El montacargas chirría antes de que nadie lo toque.',
  'Hoy las sombras caen un poco más tarde que los cuerpos.',
  'En la pared hay marcas nuevas, a la altura de una mano. Ayer no estaban.',
  'El eco tarda más en volver. La Grieta ha crecido durante la noche.',
  'Un farol encendido baja solo por el pozo, sin cable que lo sostenga.',
  'Los mapas de ayer ya no coinciden con ninguna cornisa.',
  'Se oye una voz que cuenta peldaños. Va por un número muy alto.',
  'La ciudad de arriba se apaga un segundo. Abajo, algo se enciende.',
];

/** Pista según la condición del día (id de `dayConditions.ts`). */
export const PRESAGIOS_CONDICION: Record<string, string[]> = {
  lluvia_larga: ['Las gotas llevan horas cayendo y aún no han llegado a ninguna parte.', 'El cielo que no existe se ha puesto gris.'],
  mercaderes: ['Se oyen balanzas y regateos subiendo por la pared.', 'Hoy todo tiene precio, y el precio baja con uno.'],
  eco: ['Lo que cae hoy no termina de irse.', 'Cada golpe se oye dos veces: la segunda, a tu lado.'],
  silencioso: ['Hoy la Grieta calla. Cuando hable, convendrá escuchar.', 'Ni un cable vibra. Lo poco que pase, pesará.'],
  cruzadas: ['Las corrientes se han mezclado durante la noche. Nada es de un solo sitio.', 'Hay plumas con remaches entre la chatarra del borde.'],
  pesado: ['El aire pesa desde el primer peldaño. El cuerpo lo notará.', 'Hoy lo hondo empuja hacia arriba con las dos manos.'],
  viento: ['Sopla desde abajo, y fuerte. Correr será fácil; cruzar puertas, no.', 'El viento del pozo te quita el casco antes de saltar.'],
  generoso: ['La Grieta amanece con las manos abiertas.', 'Hoy los caminos se bifurcan una vez de más.'],
  gemelos: ['Tu sombra se ha partido en dos y ninguna te sigue del todo.', 'Hoy nadie baja solo, ni siquiera quien llega solo.'],
  sin_mapa: ['Los letreros del borde están en blanco.', 'Hoy ninguna ruta dice adónde va.'],
  fiesta: ['Sube música desde abajo. Alguien ha colgado banderines en el vacío.', 'Huele a caldo y a pólvora de colores.'],
};

/** Presagio del día: determinista a partir de la semilla y la condición. */
export function presagioDelDia(seed: number, condicion: string): string {
  const r = { rngState: hashString(`${seed}:presagio`) };
  const propios = PRESAGIOS_CONDICION[condicion];
  // Con condición especial, casi siempre se insinúa; a veces el presagio no dice nada de ella.
  const pool = propios && nextFloat(r) < 0.8 ? propios : PRESAGIOS;
  return pool[Math.floor(nextFloat(r) * pool.length)];
}
