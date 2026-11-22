// Mejoras que se pagan con Ecos (Necrópolis: multiplicadores globales) y con
// Fragmentos de Vacío (Lo Hondo: infinitas). La IA las compra sola.
import type { Efectos } from '../core/mods';
import type { CurrencyId } from './currencies';

export interface MetaUpgradeDef {
  id: string;
  nombre: string;
  moneda: CurrencyId;
  coste: number;
  costeGrowth: number;
  /** Efecto por nivel. */
  efectos: Efectos;
  /** Sin tope si no se indica. */
  maxNivel?: number;
  /** Era (1-based) desde la que la IA puede comprarla. */
  eraMin?: number;
}

export const META_UPGRADES: MetaUpgradeDef[] = [
  // Necrópolis (Ecos)
  { id: 'eco_filo', nombre: 'Eco del Filo', moneda: 'ecos', coste: 10, costeGrowth: 1.5, efectos: { ataqueMult: 1.15 }, maxNivel: 20 },
  { id: 'eco_piel', nombre: 'Eco de la Piel', moneda: 'ecos', coste: 10, costeGrowth: 1.5, efectos: { vidaMult: 1.15 }, maxNivel: 20 },
  { id: 'eco_tesoro', nombre: 'Eco del Tesoro', moneda: 'ecos', coste: 14, costeGrowth: 1.6, efectos: { oroMult: 1.2 }, maxNivel: 15 },
  { id: 'eco_obra', nombre: 'Eco de la Obra', moneda: 'ecos', coste: 14, costeGrowth: 1.6, efectos: { produccionMult: 1.15 }, maxNivel: 15 },
  // Lo Hondo (Fragmentos de Vacío): sin tope
  { id: 'vacio_filo', nombre: 'Filo del Vacío', moneda: 'fragmentos', coste: 5, costeGrowth: 1.35, efectos: { ataqueMult: 1.2 } },
  { id: 'vacio_piel', nombre: 'Piel del Vacío', moneda: 'fragmentos', coste: 5, costeGrowth: 1.35, efectos: { vidaMult: 1.2 } },
  { id: 'vacio_tesoro', nombre: 'Tesoro del Vacío', moneda: 'fragmentos', coste: 8, costeGrowth: 1.4, efectos: { oroMult: 1.25 } },
  // Lo Hondo: salida para los Ecos y la Esencia que sobran cuando la Necrópolis y los talleres llegan a su tope.
  { id: 'eco_fondo', nombre: 'Eco del Fondo', moneda: 'ecos', coste: 300, costeGrowth: 1.3, efectos: { ataqueMult: 1.05, vidaMult: 1.05 }, eraMin: 5 },
  { id: 'destilado_fondo', nombre: 'Destilado del Fondo', moneda: 'esencia', coste: 400, costeGrowth: 1.3, efectos: { velAtaqueMult: 1.03, vidaMult: 1.04 }, eraMin: 5 },
];

export const META_BY_ID = Object.fromEntries(META_UPGRADES.map((m) => [m.id, m]));
