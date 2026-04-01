import { useState, useMemo, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { Harvest, UNIT_LABELS, PRODUCTION_UNITS } from "@/types/agroforest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Copy, Search, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ActiveFilters } from "@/components/ActiveFilters";

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const PAGE_SIZE = 50;

function HarvestForm({ initial, areas, onSave, onCancel }: {
  initial?: Harvest;
  areas: { id: string; name: string; modules: { id: string; name: string; cultures: { id: string; name: string }[] }[] }[];
  onSave: (h: Harvest) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<Harvest>(initial || {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    areaId: "",
    moduleId: "",
    cultureId: "",
    quantity: 0,
    unit: "kg",
    notes: "",
  });
  const set = (k: string, v: any) => setData(prev => ({ ...prev, [k]: v }));

  const selectedArea = areas.find(a => a.id === data.areaId);
  const selectedModule = selectedArea?.modules.find(m => m.id === data.moduleId);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && data.areaId && data.moduleId && data.cultureId && data.quantity > 0) {
      e.preventDefault();
      onSave(data);
    }
  };

  return (
    <div className="space-y-3 max-h-[70vh] overflow-auto pr-2" onKeyDown={handleKeyDown}>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Data</Label><Input type="date" value={data.date} onChange={e => set("date", e.target.value)} /></div>
        <div><Label>Quantidade</Label><Input type="number" step="0.01" value={data.quantity} onChange={e => set("quantity", Number(e.target.value))} /></div>
        <div><Label>Unidade</Label>
          <Select value={data.unit} onValueChange={v => set("unit", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRODUCTION_UNITS.map(u => <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div><Label>Área *</Label>
          <Select value={data.areaId || ""} onValueChange={v => { set("areaId", v); set("moduleId", ""); set("cultureId", ""); }}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedArea && (
          <div><Label>Módulo *</Label>
            <Select value={data.moduleId || ""} onValueChange={v => { set("moduleId", v); set("cultureId", ""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {selectedArea.modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {selectedModule && (
          <div><Label>Cultura *</Label>
            <Select value={data.cultureId || ""} onValueChange={v => set("cultureId", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {selectedModule.cultures.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        <Label>Observação</Label>
        <Textarea value={data.notes} onChange={e => set("notes", e.target.value)} placeholder="Observações opcionais..." className="min-h-[60px]" />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(data)} disabled={!data.areaId || !data.moduleId || !data.cultureId || data.quantity <= 0}>Salvar</Button>
      </div>
    </div>
  );
}

export default function HarvestsPage() {
  const { harvests, addHarvest, updateHarvest, deleteHarvest, areas } = useApp();
  const [dialog, setDialog] = useState<{ data?: Harvest } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [cultureFilter, setCultureFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "quantity">("date");
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
    } else {
      setPeriodFilter("all"); setStartDate(""); setEndDate("");
    }
  };

  // Build all culture options for the standalone culture filter
  const allCultures = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach(a => a.modules.forEach(m => m.cultures.forEach(c => map.set(c.id, c.name))));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [areas]);

  const filterArea = areas.find(a => a.id === areaFilter);
  const filterModule = filterArea?.modules.find(m => m.id === moduleFilter);

  const getLabel = (h: Harvest) => {
    const area = areas.find(a => a.id === h.areaId);
    const mod = area?.modules.find(m => m.id === h.moduleId);
    const culture = mod?.cultures.find(c => c.id === h.cultureId);
    return { areaName: area?.name || "?", moduleName: mod?.name || "?", cultureName: culture?.name || "?" };
  };

  const filtered = useMemo(() => {
    let list = [...harvests];
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(h => {
        const { cultureName } = getLabel(h);
        return (h.notes || "").toLowerCase().includes(q) || cultureName.toLowerCase().includes(q);
      });
    }
    // Culture-only filter (special rule: ignore area/module)
    if (cultureFilter !== "all" && areaFilter === "all") {
      list = list.filter(h => h.cultureId === cultureFilter);
    } else {
      if (areaFilter !== "all") list = list.filter(h => h.areaId === areaFilter);
      if (moduleFilter !== "all") list = list.filter(h => h.moduleId === moduleFilter);
      if (cultureFilter !== "all") list = list.filter(h => h.cultureId === cultureFilter);
    }
    // Period
    const now = new Date();
    if (periodFilter === "custom" && startDate && endDate) {
      list = list.filter(h => h.date >= startDate && h.date <= endDate);
    }
    // Sort
    list.sort((a, b) => {
      const cmp = sortBy === "quantity" ? a.quantity - b.quantity : a.date.localeCompare(b.date);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [harvests, search, areaFilter, moduleFilter, cultureFilter, periodFilter, startDate, endDate, sortBy, sortDir, areas]);

  const visible = filtered.slice(0, visibleCount);

  // Summary
  const totalAll = harvests.reduce((s, h) => s + h.quantity, 0);
  const totalFiltered = filtered.reduce((s, h) => s + h.quantity, 0);

  const byCulture = useMemo(() => {
    const map: Record<string, { name: string; total: number; unit: string }> = {};
    filtered.forEach(h => {
      const { cultureName } = getLabel(h);
      if (!map[h.cultureId]) map[h.cultureId] = { name: cultureName, total: 0, unit: h.unit };
      map[h.cultureId].total += h.quantity;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered, areas]);

  const activeFiltersList = useMemo(() => {
    const f: { label: string; onClear: () => void }[] = [];
    if (areaFilter !== "all") f.push({ label: `Área: ${areas.find(a => a.id === areaFilter)?.name || "?"}`, onClear: () => { setAreaFilter("all"); setModuleFilter("all"); setCultureFilter("all"); } });
    if (moduleFilter !== "all") f.push({ label: `Módulo: ${filterModule?.name || "?"}`, onClear: () => { setModuleFilter("all"); setCultureFilter("all"); } });
    if (cultureFilter !== "all") f.push({ label: `Cultura: ${allCultures.find(c => c.id === cultureFilter)?.name || "?"}`, onClear: () => setCultureFilter("all") });
    if (periodFilter !== "all") f.push({ label: `Período: ${startDate} a ${endDate}`, onClear: () => { setPeriodFilter("all"); setStartDate(""); setEndDate(""); } });
    if (search) f.push({ label: `Busca: "${search}"`, onClear: () => setSearch("") });
    return f;
  }, [areaFilter, moduleFilter, cultureFilter, periodFilter, startDate, endDate, search, areas, allCultures, filterModule]);

  const duplicate = (h: Harvest) => addHarvest({ ...h, id: crypto.randomUUID() });
  const toggleSort = (field: "date" | "quantity") => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title">Colheitas</h2>
        <Button className="gap-2" onClick={() => setDialog({})}>
          <Plus className="h-4 w-4" /> Nova Colheita <kbd className="ml-1 text-xs opacity-60 bg-muted px-1 rounded">Q</kbd>
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar cultura ou observação..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setQuickFilter("7d")}>Últimos 7 dias</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickFilter("30d")}>Últimos 30 dias</Button>
          {periodFilter === "custom" && (
            <>
              <Input type="date" className="w-40 h-9" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input type="date" className="w-40 h-9" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </>
          )}
          {periodFilter !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setQuickFilter("all")}>Limpar período</Button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {areas.length > 0 && (
            <Select value={areaFilter} onValueChange={v => { setAreaFilter(v); setModuleFilter("all"); if (v !== "all") setCultureFilter("all"); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Áreas</SelectItem>
                {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {filterArea && (
            <Select value={moduleFilter} onValueChange={v => { setModuleFilter(v); setCultureFilter("all"); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Módulos</SelectItem>
                {filterArea.modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {/* Culture filter: if area selected, show cultures from filtered module/area; otherwise show all cultures */}
          {(areaFilter === "all" ? allCultures.length > 0 : (filterModule ? filterModule.cultures.length > 0 : false)) && (
            <Select value={cultureFilter} onValueChange={setCultureFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Culturas</SelectItem>
                {(areaFilter === "all" ? allCultures : (filterModule?.cultures || []).map(c => ({ id: c.id, name: c.name }))).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <ActiveFilters filters={activeFiltersList} />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Total geral</span>
          <p className="text-lg font-semibold font-display">{fmt(totalAll)}</p>
        </div>
        <div className="metric-card">
          <span className="text-xs text-muted-foreground">Total no período</span>
          <p className="text-lg font-semibold font-display">{fmt(totalFiltered)}</p>
        </div>
        {byCulture.slice(0, 2).map(c => (
          <div key={c.name} className="metric-card">
            <span className="text-xs text-muted-foreground">{c.name}</span>
            <p className="text-lg font-semibold font-display">{fmt(c.total)} {UNIT_LABELS[c.unit] || c.unit}</p>
          </div>
        ))}
      </div>

      {/* Sort buttons */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => toggleSort("date")}>
          <ArrowUpDown className="h-3 w-3" /> Data {sortBy === "date" && (sortDir === "desc" ? "↓" : "↑")}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => toggleSort("quantity")}>
          <ArrowUpDown className="h-3 w-3" /> Quantidade {sortBy === "quantity" && (sortDir === "desc" ? "↓" : "↑")}
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">Nenhuma colheita registrada</p>
            <p className="text-sm">Registre colheitas para acompanhar a produção real.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Registros ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {visible.map(h => {
                const { areaName, moduleName, cultureName } = getLabel(h);
                return (
                  <motion.div key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{h.date}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">{cultureName}</Badge>
                      <span className="text-muted-foreground text-xs">{areaName} → {moduleName}</span>
                      {h.notes && <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={h.notes}>📝 {h.notes}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{fmt(h.quantity)} {UNIT_LABELS[h.unit] || h.unit}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(h)} title="Duplicar">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ data: h })}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(h.id)}>
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
            <DialogTitle className="font-display">{dialog?.data ? "Editar Colheita" : "Nova Colheita"}</DialogTitle>
          </DialogHeader>
          <HarvestForm
            initial={dialog?.data}
            areas={areas}
            onCancel={() => setDialog(null)}
            onSave={h => {
              if (dialog?.data) updateHarvest(h);
              else addHarvest(h);
              setDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteHarvest(deleteId); setDeleteId(null); }}
      />
    </div>
  );
}
