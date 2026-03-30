import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useSearchParams } from "react-router-dom";
import {
  Module, Culture, Input as InputType, AdditionalCost,
  getModuleTotalCost, getModuleRevenue, getModuleProfit,
  getAreaHectares, UNIT_LABELS, PRODUCTION_UNITS, SALE_UNITS,
  getEffectiveProductivity, convertUnits, getCultureAnnualRevenue,
} from "@/types/agroforest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, MessageSquare, Eye, EyeOff, ClipboardCopy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CultureForm({ initial, moduleSize, onSave, onCancel }: {
  initial?: Culture; moduleSize: number; onSave: (c: Culture) => void; onCancel: () => void;
}) {
  const [data, setData] = useState<Culture>(initial || {
    id: crypto.randomUUID(), name: "",
    implantationType: "mudas",
    quantity: 0, unit: "mudas",
    unitPrice: 0, priceDate: new Date().toISOString().slice(0, 10), priceHistory: [],
    finalPlantsPerModule: 0, seedsPerHole: undefined, holesPerModule: undefined,
    estimatedProductivity: 0, productivityPer: "modulo",
    productionUnit: "kg",
    salePrice: 0, saleUnit: "kg",
    salePriceDate: new Date().toISOString().slice(0, 10), salePriceHistory: [],
    monthsToProduction: 0, harvestsPerYear: 1, productionDurationYears: 1,
    active: true, notes: "",
  });
  const set = (k: string, v: any) => setData(prev => ({ ...prev, [k]: v }));

  const effectiveProd = getEffectiveProductivity(data, moduleSize);
  const convertedProd = convertUnits(effectiveProd, data.productionUnit, data.saleUnit);
  const annualRevenue = convertedProd * data.harvestsPerYear * data.salePrice;

  return (
    <div className="space-y-3 max-h-[70vh] overflow-auto pr-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nome</Label><Input value={data.name} onChange={e => set("name", e.target.value)} /></div>

        <div className="col-span-2">
          <Label>Tipo de Implantação</Label>
          <Select value={data.implantationType} onValueChange={v => {
            set("implantationType", v);
            if (v === "mudas") set("unit", "mudas");
            else set("unit", "sementes");
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mudas">Mudas</SelectItem>
              <SelectItem value="sementes">Sementes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div><Label>Quantidade</Label><Input type="number" value={data.quantity} onChange={e => set("quantity", Number(e.target.value))} /></div>
        <div><Label>Unidade</Label>
          <Select value={data.unit} onValueChange={v => set("unit", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["mudas", "sementes", "unidades"].map(u => <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {data.implantationType === "sementes" && (
          <>
            <div className="col-span-2">
              <Label>Plantas Finais por Módulo *</Label>
              <Input type="number" value={data.finalPlantsPerModule} onChange={e => set("finalPlantsPerModule", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Número de plantas que permanecerão após desbaste</p>
            </div>
            <div>
              <Label>Sementes por Cova</Label>
              <Input type="number" value={data.seedsPerHole || ""} onChange={e => set("seedsPerHole", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div>
              <Label>Covas por Módulo</Label>
              <Input type="number" value={data.holesPerModule || ""} onChange={e => set("holesPerModule", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </>
        )}

        <div><Label>{data.implantationType === 'sementes' ? 'Preço Unitário da Semente (R$)' : 'Preço Unitário da Muda (R$)'}</Label><Input type="number" step="0.01" value={data.unitPrice} onChange={e => set("unitPrice", Number(e.target.value))} /></div>

        <div>
          <Label>Produtividade Estimada</Label>
          <Input type="number" value={data.estimatedProductivity} onChange={e => set("estimatedProductivity", Number(e.target.value))} />
        </div>
        <div>
          <Label>Produtividade por</Label>
          <Select value={data.productivityPer} onValueChange={v => set("productivityPer", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="modulo">Módulo</SelectItem>
              <SelectItem value="hectare">Hectare</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.productivityPer === "hectare" && (
          <div className="col-span-2 p-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Convertido: {effectiveProd.toFixed(2)} {UNIT_LABELS[data.productionUnit]}/módulo (módulo de {moduleSize}m²)
          </div>
        )}

        <div>
          <Label>Unidade de Produção</Label>
          <Select value={data.productionUnit} onValueChange={v => set("productionUnit", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRODUCTION_UNITS.map(u => <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <Label>Unidade de Venda</Label>
          <Select value={data.saleUnit} onValueChange={v => set("saleUnit", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SALE_UNITS.map(u => <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div><Label>Preço de Venda (R$/{UNIT_LABELS[data.saleUnit]})</Label><Input type="number" step="0.01" value={data.salePrice} onChange={e => set("salePrice", Number(e.target.value))} /></div>
        <div><Label>Data Cotação Venda</Label><Input type="date" value={data.salePriceDate} onChange={e => set("salePriceDate", e.target.value)} /></div>

        <div><Label>Meses até Produção</Label><Input type="number" value={data.monthsToProduction} onChange={e => set("monthsToProduction", Number(e.target.value))} /></div>
        <div><Label>Safras por Ano</Label><Input type="number" min={1} value={data.harvestsPerYear} onChange={e => set("harvestsPerYear", Number(e.target.value))} /></div>
        <div>
          <Label>Duração da Produção (anos)</Label>
          <Input type="number" min={1} value={data.productionDurationYears} onChange={e => set("productionDurationYears", Number(e.target.value))} />
          <p className="text-xs text-muted-foreground mt-1">1 = anual, &gt;1 = perene</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm space-y-1">
        <p className="font-medium text-primary">Prévia de Receita</p>
        <p>Produção/módulo: {effectiveProd.toFixed(2)} {UNIT_LABELS[data.productionUnit]}</p>
        {data.productionUnit !== data.saleUnit && (
          <p>Convertido: {convertedProd.toFixed(2)} {UNIT_LABELS[data.saleUnit]}</p>
        )}
        <p>Receita anual/módulo: {fmt(annualRevenue)} ({data.harvestsPerYear} safra(s))</p>
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea value={data.notes} onChange={e => set("notes", e.target.value)} placeholder="Anotações, links..." className="min-h-[60px]" />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(data)} disabled={!data.name.trim() || (data.implantationType === 'sementes' && data.finalPlantsPerModule <= 0)}>Salvar</Button>
      </div>
    </div>
  );
}

function InputForm({ initial, onSave, onCancel }: {
  initial?: InputType; onSave: (i: InputType) => void; onCancel: () => void;
}) {
  const [data, setData] = useState<InputType>(initial || {
    id: crypto.randomUUID(), name: "", unitType: "quilo",
    price: 0, priceDate: new Date().toISOString().slice(0, 10), priceHistory: [], quantity: 0,
    notes: "",
  });
  const set = (k: string, v: any) => setData(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nome</Label><Input value={data.name} onChange={e => set("name", e.target.value)} /></div>
        <div><Label>Unidade</Label>
          <Select value={data.unitType} onValueChange={v => set("unitType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["tonelada", "quilo", "saco", "metro", "litro", "unidade"].map(u => <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={data.price} onChange={e => set("price", Number(e.target.value))} /></div>
        <div><Label>Data Cotação</Label><Input type="date" value={data.priceDate} onChange={e => set("priceDate", e.target.value)} /></div>
        <div><Label>Quantidade</Label><Input type="number" value={data.quantity} onChange={e => set("quantity", Number(e.target.value))} /></div>
      </div>
      <p className="text-sm text-muted-foreground">Custo total: {fmt(data.price * data.quantity)}</p>
      <div>
        <Label>Observações</Label>
        <Textarea value={data.notes} onChange={e => set("notes", e.target.value)} placeholder="Anotações, links..." className="min-h-[60px]" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(data)} disabled={!data.name.trim()}>Salvar</Button>
      </div>
    </div>
  );
}

function CostForm({ initial, onSave, onCancel }: {
  initial?: AdditionalCost; onSave: (c: AdditionalCost) => void; onCancel: () => void;
}) {
  const [data, setData] = useState<AdditionalCost>(initial || {
    id: crypto.randomUUID(), type: "mao_de_obra", description: "", value: 0,
    date: new Date().toISOString().slice(0, 10), notes: "",
  });
  const set = (k: string, v: any) => setData(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Tipo</Label>
          <Select value={data.type} onValueChange={v => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["mao_de_obra", "maquinas", "outros"].map(u => <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={data.value} onChange={e => set("value", Number(e.target.value))} /></div>
        <div className="col-span-2"><Label>Descrição</Label><Input value={data.description} onChange={e => set("description", e.target.value)} /></div>
        <div><Label>Data</Label><Input type="date" value={data.date} onChange={e => set("date", e.target.value)} /></div>
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea value={data.notes} onChange={e => set("notes", e.target.value)} placeholder="Anotações, links..." className="min-h-[60px]" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(data)} disabled={!data.description.trim()}>Salvar</Button>
      </div>
    </div>
  );
}

function ModuleCard({ mod, areaId, moduleSize, allModules, onUpdate }: {
  mod: Module; areaId: string; moduleSize: number;
  allModules: { areaId: string; areaName: string; moduleId: string; moduleName: string }[];
  onUpdate: (m: Module) => void;
}) {
  const { duplicateModule, copyCultures, updateArea, areas } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState<{ type: string; data?: any } | null>(null);
  const [copyDialog, setCopyDialog] = useState(false);
  const [copyTarget, setCopyTarget] = useState("");

  const updateCultures = (cultures: Culture[]) => onUpdate({ ...mod, cultures });
  const updateInputs = (inputs: InputType[]) => onUpdate({ ...mod, inputs });
  const updateCosts = (additionalCosts: AdditionalCost[]) => onUpdate({ ...mod, additionalCosts });

  const toggleCultureActive = (cultureId: string) => {
    updateCultures(mod.cultures.map(c => c.id === cultureId ? { ...c, active: !c.active } : c));
  };

  const toggleModuleActive = () => {
    onUpdate({ ...mod, active: !mod.active });
  };

  const [editingName, setEditingName] = useState(false);
  const [moduleName, setModuleName] = useState(mod.name);

  const handleNameSave = () => {
    if (moduleName.trim()) {
      onUpdate({ ...mod, name: moduleName.trim() });
    }
    setEditingName(false);
  };

  const handleCopyCultures = () => {
    if (!copyTarget) return;
    const [targetAreaId, targetModuleId] = copyTarget.split("|");
    copyCultures(areaId, mod.id, targetAreaId, targetModuleId);
    setCopyDialog(false);
    setCopyTarget("");
  };

  return (
    <Card className={!mod.active ? 'opacity-50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {editingName ? (
              <Input
                value={moduleName}
                onChange={e => setModuleName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                className="h-7 text-base font-display font-semibold max-w-[200px]"
                autoFocus
              />
            ) : (
              <CardTitle
                className="text-base font-display cursor-pointer hover:text-primary transition-colors"
                onClick={() => setEditingName(true)}
                title="Clique para renomear"
              >
                {mod.name}
              </CardTitle>
            )}
            {!mod.active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{fmt(getModuleTotalCost(mod))} custo</Badge>
            <Badge variant="outline" className={`text-xs ${getModuleProfit(mod, moduleSize) >= 0 ? 'border-success/50 text-success' : 'border-destructive/50 text-destructive'}`}>
              {fmt(getModuleProfit(mod, moduleSize))} lucro
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggleModuleActive}>
                  {mod.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{mod.active ? "Desativar" : "Ativar"}</TooltipContent>
            </Tooltip>
            <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-muted">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <CardContent className="pt-2 space-y-4">
              <Tabs defaultValue="cultures">
                <TabsList className="w-full">
                  <TabsTrigger value="cultures" className="flex-1">Culturas ({mod.cultures.length})</TabsTrigger>
                  <TabsTrigger value="inputs" className="flex-1">Insumos ({mod.inputs.length})</TabsTrigger>
                  <TabsTrigger value="costs" className="flex-1">Custos ({mod.additionalCosts.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="cultures" className="space-y-2">
                  {mod.cultures.map(c => (
                    <div key={c.id} className={`p-2 rounded-lg bg-muted/50 text-sm ${!c.active ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch checked={c.active} onCheckedChange={() => toggleCultureActive(c.id)} />
                          <div>
                            <span className="font-medium">{c.name}</span>
                            {!c.active && <Badge variant="secondary" className="ml-2 text-xs">Inativa</Badge>}
                            <span className="text-muted-foreground ml-2">{c.quantity} {UNIT_LABELS[c.unit]}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.notes && (
                            <Tooltip>
                              <TooltipTrigger><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                              <TooltipContent className="max-w-[300px]"><p className="text-xs whitespace-pre-wrap">{c.notes}</p></TooltipContent>
                            </Tooltip>
                          )}
                          <span className="text-muted-foreground">{fmt(c.quantity * c.unitPrice)}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ type: "culture", data: c })}>
                            <Edit2Icon className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            onClick={() => updateCultures(mod.cultures.filter(x => x.id !== c.id))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setDialog({ type: "culture" })}>
                    <Plus className="h-3 w-3" /> Adicionar Cultura
                  </Button>
                </TabsContent>

                <TabsContent value="inputs" className="space-y-2">
                  {mod.inputs.map(inp => (
                    <div key={inp.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inp.name}</span>
                        <span className="text-muted-foreground">{inp.quantity} {UNIT_LABELS[inp.unitType]}</span>
                        {inp.notes && (
                          <Tooltip>
                            <TooltipTrigger><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent className="max-w-[300px]"><p className="text-xs whitespace-pre-wrap">{inp.notes}</p></TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{fmt(inp.price * inp.quantity)}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ type: "input", data: inp })}>
                          <Edit2Icon className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => updateInputs(mod.inputs.filter(x => x.id !== inp.id))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setDialog({ type: "input" })}>
                    <Plus className="h-3 w-3" /> Adicionar Insumo
                  </Button>
                </TabsContent>

                <TabsContent value="costs" className="space-y-2">
                  {mod.additionalCosts.map(cost => (
                    <div key={cost.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cost.description}</span>
                        <Badge variant="secondary" className="text-xs">{UNIT_LABELS[cost.type]}</Badge>
                        {cost.notes && (
                          <Tooltip>
                            <TooltipTrigger><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent className="max-w-[300px]"><p className="text-xs whitespace-pre-wrap">{cost.notes}</p></TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{fmt(cost.value)}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ type: "cost", data: cost })}>
                          <Edit2Icon className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => updateCosts(mod.additionalCosts.filter(x => x.id !== cost.id))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setDialog({ type: "cost" })}>
                    <Plus className="h-3 w-3" /> Adicionar Custo
                  </Button>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-2 border-t flex-wrap">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => duplicateModule(areaId, mod.id)}>
                  <Copy className="h-3 w-3" /> Duplicar Módulo
                </Button>
                {mod.cultures.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setCopyDialog(true)}>
                    <ClipboardCopy className="h-3 w-3" /> Copiar Culturas
                  </Button>
                )}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Culture/Input/Cost dialogs */}
      <Dialog open={!!dialog} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {dialog?.type === "culture" ? (dialog.data ? "Editar Cultura" : "Nova Cultura") :
               dialog?.type === "input" ? (dialog?.data ? "Editar Insumo" : "Novo Insumo") :
               dialog?.data ? "Editar Custo" : "Novo Custo"}
            </DialogTitle>
          </DialogHeader>
          {dialog?.type === "culture" && (
            <CultureForm initial={dialog.data} moduleSize={moduleSize} onCancel={() => setDialog(null)}
              onSave={c => {
                updateCultures(dialog.data
                  ? mod.cultures.map(x => x.id === c.id ? c : x)
                  : [...mod.cultures, c]);
                setDialog(null);
              }}
            />
          )}
          {dialog?.type === "input" && (
            <InputForm initial={dialog.data} onCancel={() => setDialog(null)}
              onSave={i => {
                updateInputs(dialog.data
                  ? mod.inputs.map(x => x.id === i.id ? i : x)
                  : [...mod.inputs, i]);
                setDialog(null);
              }}
            />
          )}
          {dialog?.type === "cost" && (
            <CostForm initial={dialog.data} onCancel={() => setDialog(null)}
              onSave={c => {
                updateCosts(dialog.data
                  ? mod.additionalCosts.map(x => x.id === c.id ? c : x)
                  : [...mod.additionalCosts, c]);
                setDialog(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Copy cultures dialog */}
      <Dialog open={copyDialog} onOpenChange={setCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Copiar Culturas para...</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Módulo de destino</Label>
            <Select value={copyTarget} onValueChange={setCopyTarget}>
              <SelectTrigger><SelectValue placeholder="Selecione o módulo" /></SelectTrigger>
              <SelectContent>
                {allModules
                  .filter(m => !(m.areaId === areaId && m.moduleId === mod.id))
                  .map(m => (
                    <SelectItem key={`${m.areaId}|${m.moduleId}`} value={`${m.areaId}|${m.moduleId}`}>
                      {m.areaName} / {m.moduleName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCopyDialog(false)}>Cancelar</Button>
              <Button onClick={handleCopyCultures} disabled={!copyTarget}>Copiar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Edit2Icon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}

export default function ModulesPage() {
  const { areas, updateArea } = useApp();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const areaId = searchParams.get("area");

  const selectedArea = areaId ? areas.find(a => a.id === areaId) : areas[0];

  const allModules = areas.flatMap(a =>
    a.modules.map(m => ({ areaId: a.id, areaName: a.name, moduleId: m.id, moduleName: m.name }))
  );

  if (areas.length === 0) {
    return (
      <div className="page-container">
        <h2 className="section-title">Módulos</h2>
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            Cadastre uma área primeiro para gerenciar módulos.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleModuleUpdate = (mod: Module) => {
    if (!selectedArea) return;
    updateArea({
      ...selectedArea,
      modules: selectedArea.modules.map(m => m.id === mod.id ? mod : m),
    });
  };

  const filteredModules = selectedArea?.modules.filter(m => {
    if (filter === 'active') return m.active;
    if (filter === 'inactive') return !m.active;
    return true;
  }) || [];

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title">Módulos</h2>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={v => setFilter(v as any)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          {areas.length > 1 && (
            <Select value={selectedArea?.id} onValueChange={id => {
              const url = new URL(window.location.href);
              url.searchParams.set("area", id);
              window.history.replaceState({}, "", url.toString());
            }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Selecione a área" /></SelectTrigger>
              <SelectContent>
                {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {selectedArea && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {selectedArea.name} — {selectedArea.modules.length} módulos — {getAreaHectares(selectedArea).toFixed(2)} ha
          </p>
          {filteredModules.map(mod => (
            <ModuleCard key={mod.id} mod={mod} areaId={selectedArea.id} moduleSize={selectedArea.moduleSize} allModules={allModules} onUpdate={handleModuleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
