export type StatId =
  | 'vida'
  | 'ataque'
  | 'velocidadAtaque'
  | 'critico'
  | 'danoCritico'
  | 'defensa'
  | 'regeneracion'
  | 'alcance'
  | 'velocidad';

export interface UpgradeDef {
  id: string;
  nombre: string;
  stat: StatId;
  /** 'mult': stat × perLevel^n · 'add': stat + perLevel × n */
  mode: 'mult' | 'add';
  perLevel: number;
  baseCost: number;
  /** Tope del valor de la estadística (opcional). */
  maxValue?: number;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'ataque', nombre: 'Ataque', stat: 'ataque', mode: 'mult', perLevel: 1.1, baseCost: 8 },
  { id: 'vida', nombre: 'Vida', stat: 'vida', mode: 'mult', perLevel: 1.1, baseCost: 8 },
  { id: 'velocidadAtaque', nombre: 'Vel. de ataque', stat: 'velocidadAtaque', mode: 'add', perLevel: 0.05, baseCost: 20 },
  { id: 'defensa', nombre: 'Defensa', stat: 'defensa', mode: 'add', perLevel: 4, baseCost: 12 },
  { id: 'regeneracion', nombre: 'Regeneración', stat: 'regeneracion', mode: 'add', perLevel: 0.001, baseCost: 15, maxValue: 0.08 },
  { id: 'critico', nombre: 'Crítico', stat: 'critico', mode: 'add', perLevel: 0.01, baseCost: 25, maxValue: 0.5 },
];
