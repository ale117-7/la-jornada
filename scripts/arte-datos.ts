// Vuelca el contenido que necesita arte (personajes, criaturas, jefes, escenarios, sucesos) a JSON,
// para la guía del artista. Uso: npx tsx scripts/arte-datos.ts > salida.json
import { BUILDINGS } from '../src/data/buildings';
import { COMPANIONS } from '../src/data/companions';
import { ERAS, LAYER_VARIANTS } from '../src/data/eras';
import { EVENTS } from '../src/data/events';
import { FAMILIES } from '../src/data/families';
import { MODIFIERS } from '../src/data/modifiers';
import { MUTATIONS } from '../src/data/mutations';
import { CHASSIS, ENTRY_POINTS } from '../src/data/origins';
import { PETS } from '../src/data/pets';
import { MECHANICS, SUBLAYERS, CICLO_UMBRALES } from '../src/data/route';
import { CORRIENTES } from '../src/data/tags';

const pick = <T extends object>(o: T, keys: string[]) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, (o as Record<string, unknown>)[k]]));
console.log(
  JSON.stringify({
    corrientes: CORRIENTES,
    eras: ERAS.map((e, i) => ({ ...pick(e, ['nombre', 'capa', 'romano', 'depthStart']), jefe: e.jefe, variantes: LAYER_VARIANTS[i] ?? null })),
    familias: FAMILIES.map((f) => pick(f, ['id', 'nombre', 'corriente', 'etiqueta', 'forma', 'vuela', 'range', 'fem'])),
    modificadores: MODIFIERS.map((m) => pick(m, ['id', 'adj', 'color', 'zonaMin', 'horaMin', 'grande', 'explota', 'divide', 'texto'])),
    entradas: ENTRY_POINTS.map((e) => pick(e, ['id', 'nombre', 'corriente', 'texto', 'familias', 'etiquetas'])),
    chasis: CHASSIS.map((c) => pick(c, ['id', 'nombre', 'texto', 'etiquetas'])),
    companeros: COMPANIONS.map((c) => pick(c, ['id', 'nombre', 'corriente', 'etiquetas', 'texto', 'evolucion', 'rareza'])),
    mascotas: PETS.map((p) => pick(p, ['id', 'nombre', 'texto'])),
    mutaciones: MUTATIONS.map((m) => pick(m, ['id', 'nombre', 'color', 'buena'])),
    edificios: BUILDINGS.map((b) => pick(b, ['id', 'nombre', 'era', 'maxNivel', 'texto'])),
    subcapas: SUBLAYERS.map((s) => ({ ...s, mecanica: MECHANICS.find((m) => m.id === s.mecanica) })),
    cicloUmbrales: CICLO_UMBRALES,
    sucesos: EVENTS.filter((e) => e.categoria === 'Rarezas' || e.capa || e.categoria === 'Peligros' || e.categoria === 'Clima y capa').map((e) => pick(e, ['id', 'nombre', 'categoria', 'corriente', 'eraMin', 'textoLog'])),
  }),
);
