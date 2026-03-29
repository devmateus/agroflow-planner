import { useApp } from "@/contexts/AppContext";
import {
  getAreaTotalCost,
  getAreaTotalRevenue,
  getAreaTotalProfit,
  getAreaHectares,
  getMonthlyRevenue,
  getEstimatedReturnMonths,
  MONTHS,
} from "@/types/agroforest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TreePine, DollarSign, TrendingUp, Clock, MapPin, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard() {
  const { areas, tasks } = useApp();

  const totalModules = areas.reduce((s, a) => s + a.modules.length, 0);
  const totalHa = areas.reduce((s, a) => s + getAreaHectares(a), 0);
  const totalCost = areas.reduce((s, a) => s + getAreaTotalCost(a), 0);
  const totalRevenue = areas.reduce((s, a) => s + getAreaTotalRevenue(a), 0);
  const totalProfit = areas.reduce((s, a) => s + getAreaTotalProfit(a), 0);

  // Aggregate monthly revenue across all areas
  const monthlyData = MONTHS.map((month, i) => ({
    month,
    receita: areas.reduce((s, a) => s + getMonthlyRevenue(a)[i], 0),
  }));

  const pendingTasks = tasks.filter((t) => t.status === "pendente");
  const returnMonths = areas.length > 0 ? getEstimatedReturnMonths(areas[0]) : null;

  const metrics = [
    { label: "Áreas", value: areas.length, icon: MapPin, color: "text-primary" },
    { label: "Módulos", value: totalModules, icon: TreePine, color: "text-primary" },
    { label: "Hectares", value: totalHa.toFixed(2), icon: MapPin, color: "text-primary" },
    { label: "Custo Total", value: fmt(totalCost), icon: DollarSign, color: "text-destructive" },
    { label: "Receita Estimada", value: fmt(totalRevenue), icon: TrendingUp, color: "text-success" },
    { label: "Lucro Projetado", value: fmt(totalProfit), icon: TrendingUp, color: totalProfit >= 0 ? "text-success" : "text-destructive" },
  ];

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Painel Geral</h2>
        {returnMonths !== null && (
          <Badge variant="outline" className="gap-1 text-sm border-primary text-primary">
            <Clock className="h-3 w-3" />
            Retorno em ~{returnMonths} meses
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
            <CardTitle className="text-base font-display">Receita Mensal Estimada</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
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
