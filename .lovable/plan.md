

# Plano de Melhorias no AgroFloresta Planner

## Resumo

9 melhorias que tornam o sistema de cálculos explícito, com suporte a sementes/desbaste, ciclos produtivos, conversão de unidades, e projeção temporal realista.

---

## Alterações por Arquivo

### 1. `src/types/agroforest.ts` — Modelo de dados e cálculos

**Mudanças na interface `Culture`:**
- Adicionar `implantationType: 'mudas' | 'sementes'`
- Adicionar `finalPlantsPerModule: number` (obrigatório quando sementes)
- Adicionar `seedsPerHole?: number` (opcional, informativo)
- Adicionar `holesPerModule?: number` (opcional, informativo)
- Adicionar `productivityPer: 'hectare' | 'modulo'` — indica se a produtividade informada é por ha ou por módulo
- Adicionar `saleUnit: string` — unidade do preço de venda (independente da produção)
- Adicionar `notes: string` — observação com texto livre
- Adicionar `productionDurationYears: number` — duração da produção em anos (1 = anual, >1 = perene)
- Adicionar `harvestsPerYear: number` — substitui `harvestMonths`
- Adicionar `active: boolean` — para desativar sem excluir
- Remover `harvestMonths: number[]`

**Mudanças nas interfaces `Input` e `AdditionalCost`:**
- Adicionar `notes: string`

**Novas constantes:**
- `UNIT_CONVERSIONS`: mapa de conversão (ex: tonelada→kg = 1000, saca→kg = configurável)
- `SALE_UNITS`: lista de unidades de venda disponíveis

**Funções de cálculo atualizadas:**
- `getEffectiveProductivity(culture, moduleSize)` — converte produtividade de ha para módulo se necessário; usa `finalPlantsPerModule` quando implantação por sementes
- `getAnnualRevenue(culture, moduleSize)` — calcula receita anual = produtividade efetiva × safras/ano × preço de venda (com conversão de unidade automática)
- `getModuleRevenue(module, moduleSize)` — soma receita anual apenas de culturas ativas
- `getModuleTotalCost(module)` — exclui culturas inativas
- `getMonthlyRevenueTimeline(area, horizonYears)` — retorna array mês a mês considerando `monthsToProduction` e `productionDurationYears`; receita = 0 antes do início; receita distribuída uniformemente nos meses após início
- Atualizar `getEstimatedReturnMonths` para usar timeline

### 2. `src/pages/ModulesPage.tsx` — Formulário de Cultura

**CultureForm:**
- Adicionar seletor "Tipo de implantação" (mudas/sementes)
- Quando "sementes": mostrar campos `finalPlantsPerModule` (obrigatório), `seedsPerHole`, `holesPerModule`
- Adicionar seletor "Produtividade por" (hectare/módulo) ao lado do campo de produtividade; mostrar conversão calculada
- Separar "Unidade de produção" e "Unidade de venda" em campos independentes
- Substituir grid de "Meses de colheita" por campo numérico "Safras por ano"
- Adicionar campo "Duração da produção (anos)"
- Adicionar campo "Observações" (textarea)
- Adicionar toggle/botão "Ativo" na listagem de culturas (visual: cultura inativa com opacidade reduzida e badge "Inativa")

**InputForm e CostForm:**
- Adicionar campo "Observações" (textarea)

**ModuleCard:**
- Mostrar indicador visual para culturas inativas
- Excluir culturas inativas dos badges de custo/lucro

### 3. `src/pages/Dashboard.tsx` — Gráfico com horizonte temporal

- Substituir gráfico de receita mensal simples por gráfico de timeline multi-ano
- Adicionar seletor de horizonte: 3, 5, 10 anos
- Eixo X: meses ao longo dos anos (ex: "Ano 1", "Ano 2"...)
- Barras mostram receita mensal real considerando início de produção e duração de cada cultura
- Atualizar métrica "Retorno" para usar cálculo com timeline

### 4. `src/contexts/AppContext.tsx`

- Passar `moduleSize` da área nas chamadas de cálculo onde necessário (as funções de revenue agora precisam do tamanho do módulo para conversão ha→módulo)

---

## Lógica de conversão de unidades (detalhe técnico)

```text
Produção: 20 toneladas/módulo, Venda: R$5/kg
→ 20 × 1000 = 20.000 kg
→ 20.000 × R$5 = R$100.000

Produtividade por ha: 2.000 kg, Módulo: 700m²
→ (2.000 / 10.000) × 700 = 140 kg/módulo
```

Conversões suportadas: tonelada↔kg (×1000), saca↔kg (configurável, padrão 60kg).

## Fluxo de receita temporal

```text
Cultura: Café, início=24 meses, duração=10 anos, 2 safras/ano
Horizonte: 5 anos (60 meses)

Mês 1-24:  Receita = R$0
Mês 25-60: Receita = produtividade × preço × 2 safras / 12 (por mês)
```

---

## Ordem de implementação

1. Atualizar tipos e funções de cálculo em `agroforest.ts`
2. Atualizar formulários em `ModulesPage.tsx`
3. Atualizar Dashboard com gráfico temporal e horizonte
4. Ajustar contexto e demais referências

