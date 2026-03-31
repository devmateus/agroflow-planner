import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { FinanceEntry } from "@/types/agroforest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, Search } from "lucide-react";
import { motion } from "framer-motion";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinanceForm({ initial, areas, onSave, onCancel }: {
  initial?: FinanceEntry;
  areas: { id: string; name: string; modules: { id: string; name: string }[] }[];
  onSave: (e: FinanceEntry) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<FinanceEntry>(initial || {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    description: "",
    type: "despesa",
    value: 0,
  });
  const set = (k: string, v: any) => setData(prev => ({ ...prev, [k]: v }));
  const selectedArea = areas.find(a => a.id === data.areaId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Data</Label><Input type="date" value={data.date} onChange={e => set("date", e.target.value)} /></div>
        <div><Label>Tipo</Label>
          <Select value={data.type} onValueChange={v => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Descrição</Label><Input value={data.description} onChange={e => set("description", e.target.value)} placeholder="Ex: Compra de equipamento" /></div>
        <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={data.value} onChange={e => set("value", Number(e.target.value))} /></div>
      </div>

      {/* Linking */}
      {areas.length > 0 && (
        <div className="space-y-2">
          <div><Label>Área (opcional)</Label>
            <Select value={data.areaId || "none"} onValueChange={v => { set("areaId", v === "none" ? undefined : v); set("moduleId", undefined); }}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedArea && selectedArea.modules.length > 0 && (
            <div><Label>Módulo (opcional)</Label>
              <Select value={data.moduleId || "none"} onValueChange={v => set("moduleId", v === "none" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {selectedArea.modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(data)} disabled={!data.description.trim() || data.value <= 0}>Salvar</Button>
      </div>
    </div>
  );
}

export default function FinancesPage() {
  const { finances, addFinance, updateFinance, deleteFinance, areas } = useApp();
  const [dialog, setDialog] = useState<{ data?: FinanceEntry } | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const setQuickFilter = (type: string) => {
    const now = new Date();
    if (type === "7d") {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
      setPeriodFilter("custom");
    } else if (type === "30d") {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
      setPeriodFilter("custom");
    } else if (type === "month") {
      setPeriodFilter("month"); setStartDate(""); setEndDate("");
    } else if (type === "year") {
      setPeriodFilter("year"); setStartDate(""); setEndDate("");
    } else {
      setPeriodFilter("all"); setStartDate(""); setEndDate("");
    }
  };

  const filtered = useMemo(() => {
    let list = [...finances];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.description.toLowerCase().includes(q));
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (periodFilter === "month") {
      list = list.filter(f => { const [y, m] = f.date.split("-").map(Number); return y === currentYear && m === currentMonth; });
    } else if (periodFilter === "year") {
      list = list.filter(f => { const [y] = f.date.split("-").map(Number); return y === currentYear; });
    } else if (periodFilter === "custom" && startDate && endDate) {
      list = list.filter(f => f.date >= startDate && f.date <= endDate);
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [finances, search, periodFilter, startDate, endDate]);

  const totalReceitas = filtered.filter(f => f.type === "receita").reduce((s, f) => s + f.value, 0);
  const totalDespesas = filtered.filter(f => f.type === "despesa").reduce((s, f) => s + f.value, 0);
  const saldo = totalReceitas - totalDespesas;

  const getLinkedLabel = (f: FinanceEntry) => {
    const parts: string[] = [];
    const area = areas.find(a => a.id === f.areaId);
    if (area) {
      parts.push(area.name);
      const mod = area.modules.find(m => m.id === f.moduleId);
      if (mod) parts.push(mod.name);
    }
    return parts.length > 0 ? parts.join(" → ") : null;
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title">Finanças Gerais</h2>
        <Button className="gap-2" onClick={() => setDialog({})}>
          <Plus className="h-4 w-4" /> Novo Lançamento
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por descrição..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={periodFilter === "custom" ? "custom" : periodFilter} onValueChange={v => { if (v !== "custom") setQuickFilter(v); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="year">Ano atual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setQuickFilter("7d")}>Últimos 7 dias</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickFilter("30d")}>Últimos 30 dias</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickFilter("month")}>Mês atual</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickFilter("year")}>Ano atual</Button>
          {periodFilter === "custom" && (
            <>
              <Input type="date" className="w-40" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input type="date" className="w-40" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Total Receitas</span>
            </div>
            <p className="text-lg font-semibold font-display text-success">{fmt(totalReceitas)}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Total Despesas</span>
            </div>
            <p className="text-lg font-semibold font-display text-destructive">{fmt(totalDespesas)}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`h-4 w-4 ${saldo >= 0 ? 'text-success' : 'text-destructive'}`} />
              <span className="text-xs text-muted-foreground">Saldo</span>
            </div>
            <p className={`text-lg font-semibold font-display ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(saldo)}</p>
          </div>
        </motion.div>
      </div>

      {/* Entries list */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">Nenhum lançamento</p>
            <p className="text-sm">Registre receitas e despesas gerais que não pertencem a módulos específicos.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Lançamentos ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filtered.map(entry => {
                const linked = getLinkedLabel(entry);
                return (
                  <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{entry.date}</span>
                      <Badge variant={entry.type === "receita" ? "default" : "destructive"} className="text-xs shrink-0">
                        {entry.type === "receita" ? "Receita" : "Despesa"}
                      </Badge>
                      <div className="min-w-0">
                        <span className="font-medium">{entry.description}</span>
                        {linked && <p className="text-xs text-primary/70">{linked}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-medium ${entry.type === "receita" ? "text-success" : "text-destructive"}`}>
                        {entry.type === "receita" ? "+" : "-"}{fmt(entry.value)}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ data: entry })}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteFinance(entry.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!dialog} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{dialog?.data ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <FinanceForm
            initial={dialog?.data}
            areas={areas}
            onCancel={() => setDialog(null)}
            onSave={entry => {
              if (dialog?.data) updateFinance(entry);
              else addFinance(entry);
              setDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
