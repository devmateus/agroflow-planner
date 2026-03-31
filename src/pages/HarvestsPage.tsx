import { useState, useMemo } from "react";
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
import { Plus, Trash2, Edit2 } from "lucide-react";
import { motion } from "framer-motion";

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

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

  return (
    <div className="space-y-3 max-h-[70vh] overflow-auto pr-2">
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

  const sorted = useMemo(() => [...harvests].sort((a, b) => b.date.localeCompare(a.date)), [harvests]);

  const getLabel = (h: Harvest) => {
    const area = areas.find(a => a.id === h.areaId);
    const mod = area?.modules.find(m => m.id === h.moduleId);
    const culture = mod?.cultures.find(c => c.id === h.cultureId);
    return { areaName: area?.name || "?", moduleName: mod?.name || "?", cultureName: culture?.name || "?" };
  };

  // Aggregate by culture for summary
  const byCulture = useMemo(() => {
    const map: Record<string, { name: string; total: number; unit: string }> = {};
    harvests.forEach(h => {
      const { cultureName } = getLabel(h);
      const key = h.cultureId;
      if (!map[key]) map[key] = { name: cultureName, total: 0, unit: h.unit };
      map[key].total += h.quantity;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [harvests, areas]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title">Colheitas</h2>
        <Button className="gap-2" onClick={() => setDialog({})}>
          <Plus className="h-4 w-4" /> Nova Colheita
        </Button>
      </div>

      {/* Summary */}
      {byCulture.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byCulture.slice(0, 4).map(c => (
            <div key={c.name} className="metric-card">
              <span className="text-xs text-muted-foreground">{c.name}</span>
              <p className="text-lg font-semibold font-display">{fmt(c.total)} {UNIT_LABELS[c.unit] || c.unit}</p>
            </div>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">Nenhuma colheita registrada</p>
            <p className="text-sm">Registre colheitas para acompanhar a produção real.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Registros ({sorted.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sorted.map(h => {
                const { areaName, moduleName, cultureName } = getLabel(h);
                return (
                  <motion.div key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{h.date}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">{cultureName}</Badge>
                      <span className="text-muted-foreground text-xs">{areaName} → {moduleName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{fmt(h.quantity)} {UNIT_LABELS[h.unit] || h.unit}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ data: h })}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteHarvest(h.id)}>
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
    </div>
  );
}
