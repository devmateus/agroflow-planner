export interface PriceHistory {
  price: number;
  date: string;
}

export interface Culture {
  id: string;
  name: string;
  quantity: number;
  unit: 'mudas' | 'sementes' | 'unidades';
  unitPrice: number;
  priceDate: string;
  priceHistory: PriceHistory[];
  estimatedProductivity: number;
  productionUnit: 'kg' | 'saca' | 'unidade' | 'litro' | 'tonelada';
  salePrice: number;
  salePriceDate: string;
  salePriceHistory: PriceHistory[];
  monthsToProduction: number;
  harvestMonths: number[]; // 0-11
}

export interface Input {
  id: string;
  name: string;
  unitType: 'tonelada' | 'quilo' | 'saco' | 'metro' | 'litro' | 'unidade';
  price: number;
  priceDate: string;
  priceHistory: PriceHistory[];
  quantity: number;
}

export interface AdditionalCost {
  id: string;
  type: 'mao_de_obra' | 'maquinas' | 'outros';
  description: string;
  value: number;
  date: string;
}

export interface Module {
  id: string;
  name: string;
  cultures: Culture[];
  inputs: Input[];
  additionalCosts: AdditionalCost[];
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

// Calculation helpers
export function getModuleCultureCost(c: Culture): number {
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

export function getModuleRevenue(m: Module): number {
  return m.cultures.reduce((s, c) => s + c.estimatedProductivity * c.salePrice, 0);
}

export function getModuleProfit(m: Module): number {
  return getModuleRevenue(m) - getModuleTotalCost(m);
}

export function getAreaTotalCost(area: Area): number {
  return area.modules.reduce((s, m) => s + getModuleTotalCost(m), 0);
}

export function getAreaTotalRevenue(area: Area): number {
  return area.modules.reduce((s, m) => s + getModuleRevenue(m), 0);
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

export function getMonthlyRevenue(area: Area): number[] {
  const monthly = new Array(12).fill(0);
  area.modules.forEach(m => {
    m.cultures.forEach(c => {
      if (c.harvestMonths.length > 0) {
        const revenuePerMonth = (c.estimatedProductivity * c.salePrice) / c.harvestMonths.length;
        c.harvestMonths.forEach(month => {
          monthly[month] += revenuePerMonth;
        });
      }
    });
  });
  return monthly;
}

export function getEstimatedReturnMonths(area: Area): number | null {
  const totalCost = getAreaTotalCost(area);
  if (totalCost === 0) return 0;
  const monthlyRev = getMonthlyRevenue(area);
  const avgMonthlyRev = monthlyRev.reduce((a, b) => a + b, 0) / 12;
  if (avgMonthlyRev <= 0) return null;
  return Math.ceil(totalCost / avgMonthlyRev);
}
