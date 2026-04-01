import { useState, useMemo, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { FinanceEntry } from "@/types/agroforest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, Search, Copy, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ActiveFilters } from "@/components/ActiveFilters";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PAGE_SIZE = 50;

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
    notes: "",
  });
  const set = (k: string, v: any) => setData(prev => ({ ...prev, [k]: v }));
  const selectedArea = areas.find(a => a.id === data.areaId);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && data.description.trim() && data.value > 0) {
      e.preventDefault();
      onSave(data);
    }
  };

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
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

      <div>
        <Label>Observação</Label>
        <Textarea value={data.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Observações opcionais..." className="min-h-[60px]" />
      </div>

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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "value">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useKeyboardShortcut('q', useCallback(() => setDialog({}), []));

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
      list = list.filter(f => f.description.toLowerCase().includes(q) || (f.notes || "").toLowerCase().includes(q));
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
    list.sort((a, b) => {
      const cmp = sortBy === "value" ? a.value - b.value : a.date.localeCompare(b.date);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [finances, search, periodFilter, startDate, endDate, sortBy, sortDir]);

  const visible = filtered.slice(0, visibleCount);
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

  const activeFiltersList = useMemo(() => {
    const f: { label: string; onClear: () => void }[] = [];
    if (periodFilter !== "all") f.push({ label: periodFilter === "month" ? "Mês atual" : periodFilter === "year" ? "Ano atual" : `${startDate} a ${endDate}`, onClear: () => setQuickFilter("all") });
    if (search) f.push({ label: `Busca: "${search}"`, onClear: () => setSearch("") });
    return f;
  }, [periodFilter, startDate, endDate, search]);

  const duplicate = (e: FinanceEntry) => addFinance({ ...e, id: crypto.randomUUID() });
  const toggleSort = (field: "date" | "value") => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title">Finanças Gerais</h2>
        <Button className="gap-2" onClick={() => setDialog({})}>
          <Plus className="h-4 w-4" /> Novo Lançamento <kbd className="ml-1 text-xs opacity-60 bg-muted px-1 rounded">Q</kbd>
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por descrição ou observação..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={periodFilter === "custom" ? "custom" : periodFilter} onValueChange={v => { if (v !== "custom") setQuickFilter(v); else setPeriodFilter("custom"); }}>
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
              <Input type="date" className="w-40 h-9" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input type="date" className="w-40 h-9" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </>
          )}
        </div>
      </div>

      <ActiveFilters filters={activeFiltersList} />

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

      {/* Sort */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => toggleSort("date")}>
          <ArrowUpDown className="h-3 w-3" /> Data {sortBy === "date" && (sortDir === "desc" ? "↓" : "↑")}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => toggleSort("value")}>
          <ArrowUpDown className="h-3 w-3" /> Valor {sortBy === "value" && (sortDir === "desc" ? "↓" : "↑")}
        </Button>
      </div>

      {/* Entries list */}
      {visible.length === 0 ? (
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
              {visible.map(entry => {
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
                        {entry.notes && <p className="text-xs text-muted-foreground truncate">📝 {entry.notes}</p>}
                        {linked && <p className="text-xs text-primary/70">{linked}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-medium ${entry.type === "receita" ? "text-success" : "text-destructive"}`}>
                        {entry.type === "receita" ? "+" : "-"}{fmt(entry.value)}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(entry)} title="Duplicar">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ data: entry })}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(entry.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {visibleCount < filtered.length && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
                  Carregar mais {Math.min(PAGE_SIZE, filtered.length - visibleCount)} registros
                </Button>
              </div>
            )}
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

      <DeleteConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteFinance(deleteId); setDeleteId(null); }}
      />
    </div>
  );
}
