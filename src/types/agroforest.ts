export interface PriceHistory {
  price: number;
  date: string;
}

export interface Culture {
  id: string;
  name: string;
  implantationType: 'mudas' | 'sementes';
  quantity: number;
  unit: 'mudas' | 'sementes' | 'unidades';
  unitPrice: number;
  priceDate: string;
  priceHistory: PriceHistory[];
  // Seed-specific fields
  finalPlantsPerModule: number;
  seedsPerHole?: number;
  holesPerModule?: number;
  // Productivity
  estimatedProductivity: number;
  productivityPer: 'hectare' | 'modulo';
  productionUnit: 'kg' | 'saca' | 'unidade' | 'litro' | 'tonelada';
  // Sale (independent unit)
  salePrice: number;
  saleUnit: 'kg' | 'saca' | 'unidade' | 'litro' | 'tonelada';
  salePriceDate: string;
  salePriceHistory: PriceHistory[];
  // Timing
  monthsToProduction: number;
  harvestsPerYear: number;
  productionDurationYears: number;
  // Status
  active: boolean;
  notes: string;
}

export interface Input {
  id: string;
  name: string;
  unitType: 'tonelada' | 'quilo' | 'saco' | 'metro' | 'litro' | 'unidade';
  price: number;
  priceDate: string;
  priceHistory: PriceHistory[];
  quantity: number;
  notes: string;
}

export interface AdditionalCost {
  id: string;
  type: 'mao_de_obra' | 'maquinas' | 'outros';
  description: string;
  value: number;
  date: string;
  notes: string;
}

export interface Module {
  id: string;
  name: string;
  cultures: Culture[];
  inputs: Input[];
  additionalCosts: AdditionalCost[];
}

export interface FinanceEntry {
  id: string;
  date: string;
  description: string;
  type: 'receita' | 'despesa';
  value: number;
}

export interface Area {
  id: string;
  name: string;
  moduleCount: number;
  moduleSize: number; // m², default 700
  modules: Module[];
  notes: string;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  moduleId?: string;
  cultureId?: string;
  type: 'plantio' | 'adubacao' | 'colheita' | 'manutencao';
  status: 'pendente' | 'concluido';
}

export const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const UNIT_LABELS: Record<string, string> = {
  mudas: 'Mudas',
  sementes: 'Sementes',
  unidades: 'Unidades',
  kg: 'Kg',
  saca: 'Saca',
  unidade: 'Unidade',
  litro: 'Litro',
  tonelada: 'Tonelada',
  quilo: 'Quilo',
  saco: 'Saco',
  metro: 'Metro',
  mao_de_obra: 'Mão de Obra',
  maquinas: 'Máquinas',
  outros: 'Outros',
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  plantio: 'Plantio',
  adubacao: 'Adubação',
  colheita: 'Colheita',
  manutencao: 'Manutenção',
};

export const PRODUCTION_UNITS = ['kg', 'saca', 'unidade', 'litro', 'tonelada'] as const;
export const SALE_UNITS = ['kg', 'saca', 'unidade', 'litro', 'tonelada'] as const;

// Conversion factors to KG as base unit
const TO_KG: Record<string, number> = {
  kg: 1,
  tonelada: 1000,
  saca: 60, // default, configurable
  litro: 1, // treat as 1:1 for simplicity
  unidade: 1,
};

/** Convert a quantity from one unit to another */
export function convertUnits(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  const inKg = value * (TO_KG[fromUnit] || 1);
  return inKg / (TO_KG[toUnit] || 1);
}

/** Get effective productivity per module (converts from ha if needed) */
export function getEffectiveProductivity(c: Culture, moduleSize: number): number {
  if (!c.active) return 0;
  const baseProd = c.estimatedProductivity;
  if (c.productivityPer === 'hectare') {
    return (baseProd / 10000) * moduleSize;
  }
  return baseProd;
}

/** Get annual revenue for a single culture in a module */
export function getCultureAnnualRevenue(c: Culture, moduleSize: number): number {
  if (!c.active) return 0;
  const prodPerModule = getEffectiveProductivity(c, moduleSize);
  // Convert production unit to sale unit
  const convertedProd = convertUnits(prodPerModule, c.productionUnit, c.saleUnit);
  return convertedProd * c.harvestsPerYear * c.salePrice;
}

// Calculation helpers
export function getModuleCultureCost(c: Culture): number {
  if (!c.active) return 0;
  return c.quantity * c.unitPrice;
}

export function getModuleInputCost(i: Input): number {
  return i.quantity * i.price;
}

export function getModuleTotalCost(m: Module): number {
  const cultureCost = m.cultures.reduce((s, c) => s + getModuleCultureCost(c), 0);
  const inputCost = m.inputs.reduce((s, i) => s + getModuleInputCost(i), 0);
  const additionalCost = m.additionalCosts.reduce((s, c) => s + c.value, 0);
  return cultureCost + inputCost + additionalCost;
}

export function getModuleRevenue(m: Module, moduleSize: number = 700): number {
  return m.cultures.reduce((s, c) => s + getCultureAnnualRevenue(c, moduleSize), 0);
}

export function getModuleProfit(m: Module, moduleSize: number = 700): number {
  return getModuleRevenue(m, moduleSize) - getModuleTotalCost(m);
}

export function getAreaTotalCost(area: Area): number {
  return area.modules.reduce((s, m) => s + getModuleTotalCost(m), 0);
}

export function getAreaTotalRevenue(area: Area): number {
  return area.modules.reduce((s, m) => s + getModuleRevenue(m, area.moduleSize), 0);
}

export function getAreaTotalProfit(area: Area): number {
  return getAreaTotalRevenue(area) - getAreaTotalCost(area);
}

export function getAreaHectares(area: Area): number {
  return (area.moduleCount * area.moduleSize) / 10000;
}

export function getCostPerHectare(area: Area): number {
  const ha = getAreaHectares(area);
  return ha > 0 ? getAreaTotalCost(area) / ha : 0;
}

export function getRevenuePerHectare(area: Area): number {
  const ha = getAreaHectares(area);
  return ha > 0 ? getAreaTotalRevenue(area) / ha : 0;
}

/** 
 * Generate monthly revenue timeline for an area over a horizon.
 * Considers monthsToProduction and productionDurationYears for each culture.
 * Returns array of length horizonYears*12 with monthly revenue values.
 */
export function getMonthlyRevenueTimeline(area: Area, horizonYears: number): number[] {
  const totalMonths = horizonYears * 12;
  const monthly = new Array(totalMonths).fill(0);

  area.modules.forEach(m => {
    m.cultures.forEach(c => {
      if (!c.active) return;
      const startMonth = c.monthsToProduction;
      const endMonth = Math.min(startMonth + c.productionDurationYears * 12, totalMonths);
      if (startMonth >= totalMonths) return;

      const annualRev = getCultureAnnualRevenue(c, area.moduleSize);
      const monthlyRev = annualRev / 12;

      for (let i = startMonth; i < endMonth; i++) {
        monthly[i] += monthlyRev;
      }
    });
  });

  return monthly;
}

/** Estimated months until cumulative revenue covers total cost */
export function getEstimatedReturnMonths(area: Area): number | null {
  const totalCost = getAreaTotalCost(area);
  if (totalCost === 0) return 0;

  const timeline = getMonthlyRevenueTimeline(area, 30); // 30-year horizon for calculation
  let cumulative = 0;
  for (let i = 0; i < timeline.length; i++) {
    cumulative += timeline[i];
    if (cumulative >= totalCost) return i + 1;
  }
  return null; // never pays back
}
