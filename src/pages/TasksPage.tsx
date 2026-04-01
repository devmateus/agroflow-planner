import { useState, useMemo, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { Task, TASK_TYPE_LABELS, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_RECURRENCE_LABELS } from "@/types/agroforest";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit2, AlertTriangle, Clock, CheckCircle2, Circle, Search, Copy, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ActiveFilters } from "@/components/ActiveFilters";

const PAGE_SIZE = 50;

const statusColors: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-warning/30",
  em_andamento: "bg-primary/10 text-primary border-primary/30",
  concluido: "bg-success/10 text-success border-success/30",
  atrasado: "bg-destructive/10 text-destructive border-destructive/30",
};

const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-warning/10 text-warning",
  alta: "bg-destructive/10 text-destructive",
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'concluido': return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'atrasado': return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'em_andamento': return <Clock className="h-4 w-4 text-primary" />;
    default: return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

function TaskForm({ initial, areas, onSave, onCancel }: {
  initial?: Task;
  areas: { id: string; name: string; modules: { id: string; name: string; cultures: { id: string; name: string }[] }[] }[];
  onSave: (t: Task) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<Task>(initial || {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    type: "plantio",
    status: "pendente",
    priority: "media",
    recurrence: "nenhuma",
  });
  const set = (k: string, v: any) => setData(prev => ({ ...prev, [k]: v }));

  const selectedArea = areas.find(a => a.id === data.areaId);
  const selectedModule = selectedArea?.modules.find(m => m.id === data.moduleId);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && data.title.trim()) {
      e.preventDefault();
      onSave(data);
    }
  };

  return (
    <div className="space-y-3 max-h-[70vh] overflow-auto pr-2" onKeyDown={handleKeyDown}>
      <div><Label>Título</Label><Input value={data.title} onChange={e => set("title", e.target.value)} /></div>
      <div><Label>Descrição</Label><Textarea value={data.description} onChange={e => set("description", e.target.value)} placeholder="Detalhes, links..." className="min-h-[60px]" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Data</Label><Input type="date" value={data.date} onChange={e => set("date", e.target.value)} /></div>
        <div><Label>Tipo</Label>
          <Select value={data.type} onValueChange={v => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Status</Label>
          <Select value={data.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Prioridade</Label>
          <Select value={data.priority} onValueChange={v => set("priority", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Recorrência</Label>
          <Select value={data.recurrence || "nenhuma"} onValueChange={v => set("recurrence", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_RECURRENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {areas.length > 0 && (
        <div className="space-y-2">
          <div><Label>Área (opcional)</Label>
            <Select value={data.areaId || "none"} onValueChange={v => { set("areaId", v === "none" ? undefined : v); set("moduleId", undefined); set("cultureId", undefined); }}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedArea && selectedArea.modules.length > 0 && (
            <div><Label>Módulo (opcional)</Label>
              <Select value={data.moduleId || "none"} onValueChange={v => { set("moduleId", v === "none" ? undefined : v); set("cultureId", undefined); }}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {selectedArea.modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedModule && selectedModule.cultures.length > 0 && (
            <div><Label>Cultura (opcional)</Label>
              <Select value={data.cultureId || "none"} onValueChange={v => set("cultureId", v === "none" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {selectedModule.cultures.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(data)} disabled={!data.title.trim()}>Salvar</Button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask, areas } = useApp();
  const [dialog, setDialog] = useState<{ data?: Task } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [cultureFilter, setCultureFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useKeyboardShortcut('q', useCallback(() => setDialog({}), []));

  const toggle = (t: Task) => updateTask({ ...t, status: t.status === "concluido" ? "pendente" : "concluido" });

  const filterArea = areas.find(a => a.id === areaFilter);
  const filterModule = filterArea?.modules.find(m => m.id === moduleFilter);

  const filtered = useMemo(() => {
    let list = tasks
      .filter(t => statusFilter === "all" || t.status === statusFilter)
      .filter(t => priorityFilter === "all" || t.priority === priorityFilter)
      .filter(t => areaFilter === "all" || t.areaId === areaFilter)
      .filter(t => moduleFilter === "all" || t.moduleId === moduleFilter)
      .filter(t => cultureFilter === "all" || t.cultureId === cultureFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
    }

    const priorityOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
    list.sort((a, b) => {
      if (sortBy === "priority") {
        const cmp = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
        return sortDir === "desc" ? -cmp : cmp;
      }
      // Default: status then date
      const statusOrder: Record<string, number> = { atrasado: 0, pendente: 1, em_andamento: 2, concluido: 3 };
      const diff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
      if (diff !== 0) return diff;
      const cmp = a.date.localeCompare(b.date);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [tasks, statusFilter, priorityFilter, areaFilter, moduleFilter, cultureFilter, search, sortBy, sortDir]);

  const visible = filtered.slice(0, visibleCount);

  const getLinkedLabel = (t: Task) => {
    const parts: string[] = [];
    const area = areas.find(a => a.id === t.areaId);
    if (area) {
      parts.push(area.name);
      const mod = area.modules.find(m => m.id === t.moduleId);
      if (mod) {
        parts.push(mod.name);
        const culture = mod.cultures.find(c => c.id === t.cultureId);
        if (culture) parts.push(culture.name);
      }
    }
    return parts.length > 0 ? parts.join(" → ") : null;
  };

  const activeFiltersList = useMemo(() => {
    const f: { label: string; onClear: () => void }[] = [];
    if (statusFilter !== "all") f.push({ label: `Status: ${TASK_STATUS_LABELS[statusFilter]}`, onClear: () => setStatusFilter("all") });
    if (priorityFilter !== "all") f.push({ label: `Prioridade: ${TASK_PRIORITY_LABELS[priorityFilter]}`, onClear: () => setPriorityFilter("all") });
    if (areaFilter !== "all") f.push({ label: `Área: ${areas.find(a => a.id === areaFilter)?.name}`, onClear: () => { setAreaFilter("all"); setModuleFilter("all"); setCultureFilter("all"); } });
    if (moduleFilter !== "all") f.push({ label: `Módulo: ${filterModule?.name}`, onClear: () => { setModuleFilter("all"); setCultureFilter("all"); } });
    if (cultureFilter !== "all") f.push({ label: `Cultura`, onClear: () => setCultureFilter("all") });
    if (search) f.push({ label: `Busca: "${search}"`, onClear: () => setSearch("") });
    return f;
  }, [statusFilter, priorityFilter, areaFilter, moduleFilter, cultureFilter, search, areas, filterModule]);

  const duplicate = (t: Task) => addTask({ ...t, id: crypto.randomUUID(), status: "pendente" });
  const toggleSort = (field: "date" | "priority") => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title">Tarefas</h2>
        <Button className="gap-2" onClick={() => setDialog({})}>
          <Plus className="h-4 w-4" /> Nova Tarefa <kbd className="ml-1 text-xs opacity-60 bg-muted px-1 rounded">Q</kbd>
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar tarefas..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Prioridade</SelectItem>
              {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {areas.length > 0 && (
            <Select value={areaFilter} onValueChange={v => { setAreaFilter(v); setModuleFilter("all"); setCultureFilter("all"); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Áreas</SelectItem>
                {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {filterArea && filterArea.modules.length > 0 && (
            <Select value={moduleFilter} onValueChange={v => { setModuleFilter(v); setCultureFilter("all"); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Módulos</SelectItem>
                {filterArea.modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {filterModule && filterModule.cultures.length > 0 && (
            <Select value={cultureFilter} onValueChange={setCultureFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Culturas</SelectItem>
                {filterModule.cultures.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <ActiveFilters filters={activeFiltersList} />

      {/* Sort */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => toggleSort("date")}>
          <ArrowUpDown className="h-3 w-3" /> Data {sortBy === "date" && (sortDir === "desc" ? "↓" : "↑")}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => toggleSort("priority")}>
          <ArrowUpDown className="h-3 w-3" /> Prioridade {sortBy === "priority" && (sortDir === "desc" ? "↓" : "↑")}
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            Nenhuma tarefa encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((t, i) => {
            const linked = getLinkedLabel(t);
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={t.status === "concluido" ? "opacity-60" : ""}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Checkbox
                      checked={t.status === "concluido"}
                      onCheckedChange={() => toggle(t)}
                    />
                    <StatusIcon status={t.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${t.status === "concluido" ? "line-through" : ""}`}>{t.title}</span>
                        <Badge className={`text-xs ${priorityColors[t.priority]}`}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>}
                      {linked && <p className="text-xs text-primary/70 mt-0.5">{linked}</p>}
                    </div>
                    <Badge variant="secondary" className="text-xs">{TASK_TYPE_LABELS[t.type]}</Badge>
                    <Badge className={`text-xs ${statusColors[t.status]}`}>{TASK_STATUS_LABELS[t.status]}</Badge>
                    {t.recurrence && t.recurrence !== 'nenhuma' && (
                      <Badge variant="outline" className="text-xs">{TASK_RECURRENCE_LABELS[t.recurrence]}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{t.date}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(t)} title="Duplicar">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ data: t })}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {visibleCount < filtered.length && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
                Carregar mais {Math.min(PAGE_SIZE, filtered.length - visibleCount)} tarefas
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{dialog?.data ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <TaskForm
            initial={dialog?.data}
            areas={areas}
            onCancel={() => setDialog(null)}
            onSave={task => {
              if (dialog?.data) updateTask(task);
              else addTask(task);
              setDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteTask(deleteId); setDeleteId(null); }}
      />
    </div>
  );
}
