import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Task, TASK_TYPE_LABELS } from "@/types/agroforest";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask, areas } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<Task["type"]>("plantio");
  const [moduleId, setModuleId] = useState("");

  const allModules = areas.flatMap(a => a.modules.map(m => ({ ...m, areaName: a.name })));

  const handleAdd = () => {
    addTask({
      id: crypto.randomUUID(),
      title, date, type,
      moduleId: moduleId || undefined,
      status: "pendente",
    });
    setTitle(""); setDialogOpen(false);
  };

  const toggle = (t: Task) => updateTask({ ...t, status: t.status === "pendente" ? "concluido" : "pendente" });

  const filtered = tasks.filter(t => filter === "all" || t.status === filter)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title">Tarefas</h2>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="concluido">Concluídas</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Tarefa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Nova Tarefa</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                  <div><Label>Tipo</Label>
                    <Select value={type} onValueChange={v => setType(v as Task["type"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {allModules.length > 0 && (
                  <div><Label>Módulo (opcional)</Label>
                    <Select value={moduleId} onValueChange={setModuleId}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {allModules.map(m => <SelectItem key={m.id} value={m.id}>{m.areaName} / {m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAdd} disabled={!title.trim()}>Salvar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            Nenhuma tarefa encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={t.status === "concluido" ? "opacity-60" : ""}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Checkbox
                    checked={t.status === "concluido"}
                    onCheckedChange={() => toggle(t)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${t.status === "concluido" ? "line-through" : ""}`}>{t.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{TASK_TYPE_LABELS[t.type]}</Badge>
                  <span className="text-xs text-muted-foreground">{t.date}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTask(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
