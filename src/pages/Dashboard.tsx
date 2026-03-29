import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  getAreaTotalCost,
  getAreaTotalRevenue,
  getAreaTotalProfit,
  getAreaHectares,
  getMonthlyRevenueTimeline,
  getEstimatedReturnMonths,
} from "@/types/agroforest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TreePine, DollarSign, TrendingUp, Clock, MapPin, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard() {
  const { areas, tasks } = useApp();
  const [horizon, setHorizon] = useState(5);

  const totalModules = areas.reduce((s, a) => s + a.modules.length, 0);
  const totalHa = areas.reduce((s, a) => s + getAreaHectares(a), 0);
  const totalCost = areas.reduce((s, a) => s + getAreaTotalCost(a), 0);
  const totalRevenue = areas.reduce((s, a) => s + getAreaTotalRevenue(a), 0);
  const totalProfit = areas.reduce((s, a) => s + getAreaTotalProfit(a), 0);

  // Aggregate monthly revenue timeline across all areas
  const timelineData: { label: string; receita: number }[] = [];
  const totalMonths = horizon * 12;
  const aggregated = new Array(totalMonths).fill(0);
  areas.forEach(a => {
    const timeline = getMonthlyRevenueTimeline(a, horizon);
    timeline.forEach((v, i) => { aggregated[i] += v; });
  });
  for (let i = 0; i < totalMonths; i++) {
    const year = Math.floor(i / 12) + 1;
    const month = (i % 12) + 1;
    timelineData.push({
      label: i % 12 === 0 ? `Ano ${year}` : `${month}`,
      receita: aggregated[i],
    });
  }

  // Simplify: show yearly aggregates for cleaner chart
  const yearlyData = Array.from({ length: horizon }, (_, y) => {
    let total = 0;
    for (let m = 0; m < 12; m++) {
      total += aggregated[y * 12 + m] || 0;
    }
    return { label: `Ano ${y + 1}`, receita: total };
  });

  const pendingTasks = tasks.filter((t) => t.status === "pendente");
  
  // Get best return estimate across all areas
  const returnEstimates = areas.map(a => getEstimatedReturnMonths(a)).filter(v => v !== null);
  const bestReturn = returnEstimates.length > 0 ? Math.max(...(returnEstimates as number[])) : null;

  const metrics = [
    { label: "Áreas", value: areas.length, icon: MapPin, color: "text-primary" },
    { label: "Módulos", value: totalModules, icon: TreePine, color: "text-primary" },
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
                Você tem {pendingTasks.length} tarefa(s) pendente(s)
              </span>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
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

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
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
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
