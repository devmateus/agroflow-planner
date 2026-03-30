import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Area, Module, getAreaHectares, getAreaTotalCost, getAreaTotalRevenue, getAreaTotalProfit } from "@/types/agroforest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, MessageSquare, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AreaForm({ initial, onSave, onCancel }: {
  initial?: Area;
  onSave: (a: Area) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [moduleCount, setModuleCount] = useState(initial?.moduleCount || 1);
  const [moduleSize, setModuleSize] = useState(initial?.moduleSize || 700);
  const [notes, setNotes] = useState(initial?.notes || "");

  const handleSubmit = () => {
    const area: Area = {
      id: initial?.id || crypto.randomUUID(),
      name,
      active: initial?.active ?? true,
      moduleCount,
      moduleSize,
      modules: initial?.modules || Array.from({ length: moduleCount }, (_, i) => ({
        id: crypto.randomUUID(),
        name: `Módulo ${i + 1}`,
        active: true,
        cultures: [],
        inputs: [],
        additionalCosts: [],
      })),
      notes,
    };
    if (!initial && area.modules.length < moduleCount) {
      for (let i = area.modules.length; i < moduleCount; i++) {
        area.modules.push({
          id: crypto.randomUUID(),
          name: `Módulo ${i + 1}`,
          active: true,
          cultures: [],
          inputs: [],
          additionalCosts: [],
        });
      }
    }
    onSave(area);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Nome da Área</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Área Norte" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quantidade de Módulos</Label>
          <Input type="number" min={1} value={moduleCount} onChange={e => setModuleCount(Number(e.target.value))} />
        </div>
        <div>
          <Label>Tamanho do Módulo (m²)</Label>
          <Input type="number" min={1} value={moduleSize} onChange={e => setModuleSize(Number(e.target.value))} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Área total: {((moduleCount * moduleSize) / 10000).toFixed(2)} ha ({(moduleCount * moduleSize).toLocaleString()} m²)
      </p>
      <div>
        <Label>Observações</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações opcionais..." />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>Salvar</Button>
      </div>
    </div>
  );
}

export default function AreasPage() {
  const { areas, addArea, updateArea, deleteArea } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | undefined>();
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const navigate = useNavigate();

  const handleSave = (area: Area) => {
    if (editingArea) {
      updateArea(area);
    } else {
      addArea(area);
    }
    setDialogOpen(false);
    setEditingArea(undefined);
  };

  const toggleAreaActive = (area: Area) => {
    updateArea({ ...area, active: !area.active });
  };

  const filtered = areas.filter(a => {
    if (filter === 'active') return a.active;
    if (filter === 'inactive') return !a.active;
    return true;
  });

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title">Áreas</h2>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={v => setFilter(v as any)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingArea(undefined); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Área</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">{editingArea ? "Editar Área" : "Nova Área"}</DialogTitle>
              </DialogHeader>
              <AreaForm
                initial={editingArea}
                onSave={handleSave}
                onCancel={() => { setDialogOpen(false); setEditingArea(undefined); }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">Nenhuma área encontrada</p>
            <p className="text-sm">Clique em "Nova Área" para começar o planejamento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((area, i) => (
            <motion.div
              key={area.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`cursor-pointer hover:shadow-md transition-shadow ${!area.active ? 'opacity-50' : ''}`} onClick={() => navigate(`/modulos?area=${area.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-display">{area.name}</CardTitle>
                      {!area.active && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleAreaActive(area)}>
                            {area.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{area.active ? "Desativar" : "Ativar"}</TooltipContent>
                      </Tooltip>
                      {area.notes && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]"><p className="text-xs whitespace-pre-wrap">{area.notes}</p></TooltipContent>
                        </Tooltip>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingArea(area); setDialogOpen(true); }}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteArea(area.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Módulos:</span> {area.modules.length}</div>
                    <div><span className="text-muted-foreground">Hectares:</span> {getAreaHectares(area).toFixed(2)}</div>
                    <div><span className="text-muted-foreground">Custo:</span> {fmt(getAreaTotalCost(area))}</div>
                    <div><span className="text-muted-foreground">Receita:</span> {fmt(getAreaTotalRevenue(area))}</div>
                  </div>
                  <div className={`text-sm font-medium ${getAreaTotalProfit(area) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    Lucro: {fmt(getAreaTotalProfit(area))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
