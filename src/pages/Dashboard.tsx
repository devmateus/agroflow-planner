import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  getAreaTotalCost,
  getAreaTotalRevenue,
  getAreaTotalProfit,
  getAreaHectares,
  getMonthlyRevenueTimeline,
  getEstimatedReturnMonths,
  getModuleTotalCost,
  getModuleRevenue,
  getCultureAnnualRevenue,
} from "@/types/agroforest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TreePine, DollarSign, TrendingUp, Clock, MapPin, AlertTriangle, TrendingDown, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(var(--warning))",
  "hsl(152, 45%, 45%)",
  "hsl(42, 70%, 65%)",
];

export default function Dashboard() {
  const { areas, tasks, finances } = useApp();
  const [horizon, setHorizon] = useState(5);

  const activeAreas = areas.filter(a => a.active);
  const totalModules = activeAreas.reduce((s, a) => s + a.modules.filter(m => m.active).length, 0);
  const totalHa = activeAreas.reduce((s, a) => s + getAreaHectares(a), 0);
  const totalCost = activeAreas.reduce((s, a) => s + getAreaTotalCost(a), 0);
  const totalRevenue = activeAreas.reduce((s, a) => s + getAreaTotalRevenue(a), 0);
  const totalProfit = activeAreas.reduce((s, a) => s + getAreaTotalProfit(a), 0);

  // Finance totals
  const finReceitas = finances.filter(f => f.type === "receita").reduce((s, f) => s + f.value, 0);
  const finDespesas = finances.filter(f => f.type === "despesa").reduce((s, f) => s + f.value, 0);
  const finSaldo = finReceitas - finDespesas;

  // Aggregate monthly revenue timeline
  const totalMonths = horizon * 12;
  const aggregated = new Array(totalMonths).fill(0);
  activeAreas.forEach(a => {
    const timeline = getMonthlyRevenueTimeline(a, horizon);
    timeline.forEach((v, i) => { aggregated[i] += v; });
  });

  const yearlyData = Array.from({ length: horizon }, (_, y) => {
    let total = 0;
    for (let m = 0; m < 12; m++) total += aggregated[y * 12 + m] || 0;
    return { label: `Ano ${y + 1}`, receita: total };
  });

  // Cumulative profit timeline (revenue - cost spread over year 1)
  const cumulativeData = Array.from({ length: horizon }, (_, y) => {
    let cumRev = 0;
    for (let yy = 0; yy <= y; yy++) {
      for (let m = 0; m < 12; m++) cumRev += aggregated[yy * 12 + m] || 0;
    }
    const cumProfit = cumRev - totalCost;
    return { label: `Ano ${y + 1}`, lucro: cumProfit };
  });

  // Cost per module breakdown
  const costPerModule = activeAreas.flatMap(a =>
    a.modules.filter(m => m.active).map(m => ({
      name: `${a.name} / ${m.name}`,
      custo: getModuleTotalCost(m),
      receita: getModuleRevenue(m, a.moduleSize),
    }))
  );

  // Revenue per culture (top cultures)
  const cultureRevenues: { name: string; receita: number }[] = [];
  activeAreas.forEach(a => {
    a.modules.filter(m => m.active).forEach(m => {
      m.cultures.filter(c => c.active).forEach(c => {
        const existing = cultureRevenues.find(cr => cr.name === c.name);
        const rev = getCultureAnnualRevenue(c, a.moduleSize);
        if (existing) existing.receita += rev;
        else cultureRevenues.push({ name: c.name, receita: rev });
      });
    });
  });
  cultureRevenues.sort((a, b) => b.receita - a.receita);

  const pendingTasks = tasks.filter((t) => t.status === "pendente" || t.status === "atrasado");

  const returnEstimates = activeAreas.map(a => getEstimatedReturnMonths(a)).filter(v => v !== null);
  const bestReturn = returnEstimates.length > 0 ? Math.max(...(returnEstimates as number[])) : null;

  const metrics = [
    { label: "Áreas Ativas", value: activeAreas.length, icon: MapPin, color: "text-primary" },
    { label: "Módulos Ativos", value: totalModules, icon: TreePine, color: "text-primary" },
    { label: "Hectares", value: totalHa.toFixed(2), icon: MapPin, color: "text-primary" },
    { label: "Custo Total", value: fmt(totalCost), icon: DollarSign, color: "text-destructive" },
    { label: "Receita Anual", value: fmt(totalRevenue), icon: TrendingUp, color: "text-success" },
    { label: "Lucro Anual", value: fmt(totalProfit), icon: TrendingUp, color: totalProfit >= 0 ? "text-success" : "text-destructive" },
  ];

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Painel Geral</h2>
        {bestReturn !== null && bestReturn > 0 && (
          <Badge variant="outline" className="gap-1 text-sm border-primary text-primary">
            <Clock className="h-3 w-3" />
            Retorno em ~{bestReturn} meses
          </Badge>
        )}
      </div>

      {/* Alerts */}
      {pendingTasks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm font-medium">
                Você tem {pendingTasks.length} tarefa(s) pendente(s)/atrasada(s)
              </span>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className={`h-4 w-4 ${m.color}`} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-lg font-semibold font-display">{m.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Finance summary */}
      {finances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Finanças Gerais - Receitas</span>
            </div>
            <p className="text-lg font-semibold font-display text-success">{fmt(finReceitas)}</p>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Finanças Gerais - Despesas</span>
            </div>
            <p className="text-lg font-semibold font-display text-destructive">{fmt(finDespesas)}</p>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`h-4 w-4 ${finSaldo >= 0 ? 'text-success' : 'text-destructive'}`} />
              <span className="text-xs text-muted-foreground">Saldo Consolidado</span>
            </div>
            <p className={`text-lg font-semibold font-display ${(totalProfit + finSaldo) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt(totalProfit + finSaldo)}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue by year */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display">Receita Projetada por Ano</CardTitle>
              <Select value={String(horizon)} onValueChange={v => setHorizon(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 anos</SelectItem>
                  <SelectItem value="5">5 anos</SelectItem>
                  <SelectItem value="10">10 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cumulative profit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Evolução do Lucro Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="lucro" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: "hsl(var(--success))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost vs revenue per module */}
        {costPerModule.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Custo vs Receita por Módulo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={costPerModule} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="custo" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="Custo" />
                  <Bar dataKey="receita" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Revenue by culture */}
        {cultureRevenues.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Receita por Cultura</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={cultureRevenues} dataKey="receita" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {cultureRevenues.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pending tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                Nenhuma tarefa pendente 🎉
              </p>
            ) : (
              <ul className="space-y-2 max-h-[220px] overflow-auto">
                {pendingTasks.slice(0, 8).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                    <Badge className={`text-xs ${t.status === 'atrasado' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                      {t.status === 'atrasado' ? 'Atrasada' : 'Pendente'}
                    </Badge>
                    <span className="font-medium">{t.title}</span>
                    <span className="text-muted-foreground ml-auto text-xs">{t.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
