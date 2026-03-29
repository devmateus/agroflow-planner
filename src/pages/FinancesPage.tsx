import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { FinanceEntry } from "@/types/agroforest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinanceForm({ initial, onSave, onCancel }: {
  initial?: FinanceEntry; onSave: (e: FinanceEntry) => void; onCancel: () => void;
}) {
  const [data, setData] = useState<FinanceEntry>(initial || {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    description: "",
    type: "despesa",
    value: 0,
  });
  const set = (k: string, v: any) => setData(prev => ({ ...prev, [k]: v }));

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
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(data)} disabled={!data.description.trim() || data.value <= 0}>Salvar</Button>
      </div>
    </div>
  );
}

export default function FinancesPage() {
  const { finances, addFinance, updateFinance, deleteFinance } = useApp();
  const [dialog, setDialog] = useState<{ data?: FinanceEntry } | null>(null);

  const sorted = [...finances].sort((a, b) => b.date.localeCompare(a.date));
  const totalReceitas = finances.filter(f => f.type === "receita").reduce((s, f) => s + f.value, 0);
  const totalDespesas = finances.filter(f => f.type === "despesa").reduce((s, f) => s + f.value, 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Finanças Gerais</h2>
        <Button className="gap-2" onClick={() => setDialog({})}>
          <Plus className="h-4 w-4" /> Novo Lançamento
        </Button>
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
      {sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">Nenhum lançamento</p>
            <p className="text-sm">Registre receitas e despesas gerais que não pertencem a módulos específicos.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Lançamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sorted.map(entry => (
                <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20">{entry.date}</span>
                    <Badge variant={entry.type === "receita" ? "default" : "destructive"} className="text-xs">
                      {entry.type === "receita" ? "Receita" : "Despesa"}
                    </Badge>
                    <span className="font-medium">{entry.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${entry.type === "receita" ? "text-success" : "text-destructive"}`}>
                      {entry.type === "receita" ? "+" : "-"}{fmt(entry.value)}
                    </span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ data: entry })}>
                      <Edit2Icon className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteFinance(entry.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
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

function Edit2Icon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
