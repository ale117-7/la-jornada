// Monedas por era (7.3). El "oro" (Créditos / Datos / Esporas) vive aparte en DayState.gold.
export type CurrencyId = 'materiales' | 'esencia' | 'ecos' | 'fragmentos';

export interface CurrencyDef {
  id: CurrencyId;
  nombre: string;
  /** Era (1-based) en la que aparece. */
  era: number;
  fuente: string;
  uso: string;
  /** Cantidad que suelta un Umbral menor (el de era suelta el triple). */
  porUmbral: number;
  /** Cantidad que suelta cada criatura normal. */
  porBaja: number;
}

export const CURRENCIES: CurrencyDef[] = [
  { id: 'materiales', nombre: 'Materiales', era: 2, fuente: 'Base y criaturas', uso: 'Módulos de la Base', porUmbral: 25, porBaja: 1.2 },
  { id: 'esencia', nombre: 'Esencia', era: 3, fuente: 'Umbrales y talleres', uso: 'Equipo y mascotas', porUmbral: 30, porBaja: 0 },
  { id: 'ecos', nombre: 'Ecos', era: 4, fuente: 'Umbrales y Osario', uso: 'Mejoras de la Necrópolis', porUmbral: 12, porBaja: 0 },
  { id: 'fragmentos', nombre: 'Fragmentos de Vacío', era: 5, fuente: 'Umbrales y Sonda', uso: 'Mejoras infinitas de Lo Hondo', porUmbral: 6, porBaja: 0 },
];

export const CURRENCY_BY_ID = Object.fromEntries(CURRENCIES.map((c) => [c.id, c])) as Record<CurrencyId, CurrencyDef>;
