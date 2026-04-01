import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Area, Task, Module, FinanceEntry, Harvest, migrateArea, migrateTask, migrateFinance, migrateHarvest } from '@/types/agroforest';

interface AppState {
  areas: Area[];
  tasks: Task[];
  finances: FinanceEntry[];
  harvests: Harvest[];
}

interface AppContextType extends AppState {
  addArea: (area: Area) => void;
  updateArea: (area: Area) => void;
  deleteArea: (id: string) => void;
  duplicateModule: (areaId: string, moduleId: string) => void;
  copyCultures: (sourceAreaId: string, sourceModuleId: string, targetAreaId: string, targetModuleId: string) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  addFinance: (entry: FinanceEntry) => void;
  updateFinance: (entry: FinanceEntry) => void;
  deleteFinance: (id: string) => void;
  addHarvest: (harvest: Harvest) => void;
  updateHarvest: (harvest: Harvest) => void;
  deleteHarvest: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'agrofloresta-planner-data';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        areas: (parsed.areas || []).map(migrateArea),
        tasks: (parsed.tasks || []).map(migrateTask),
        finances: (parsed.finances || []).map(migrateFinance),
        harvests: (parsed.harvests || []).map(migrateHarvest),
      };
    }
  } catch {}
  return { areas: [], tasks: [], finances: [], harvests: [] };
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<Area[]>(() => loadState().areas);
  const [tasks, setTasks] = useState<Task[]>(() => loadState().tasks);
  const [finances, setFinances] = useState<FinanceEntry[]>(() => loadState().finances);
  const [harvests, setHarvests] = useState<Harvest[]>(() => loadState().harvests);

  useEffect(() => {
    saveState({ areas, tasks, finances, harvests });
  }, [areas, tasks, finances, harvests]);

  const addArea = (area: Area) => setAreas(prev => [...prev, area]);
  const updateArea = (area: Area) => setAreas(prev => prev.map(a => a.id === area.id ? area : a));
  const deleteArea = (id: string) => setAreas(prev => prev.filter(a => a.id !== id));

  const duplicateModule = (areaId: string, moduleId: string) => {
    setAreas(prev => prev.map(area => {
      if (area.id !== areaId) return area;
      const source = area.modules.find(m => m.id === moduleId);
      if (!source) return area;
      const newModule: Module = {
        ...JSON.parse(JSON.stringify(source)),
        id: crypto.randomUUID(),
        name: `${source.name} (cópia)`,
      };
      return {
        ...area,
        modules: [...area.modules, newModule],
        moduleCount: area.moduleCount + 1,
      };
    }));
  };

  const copyCultures = (sourceAreaId: string, sourceModuleId: string, targetAreaId: string, targetModuleId: string) => {
    setAreas(prev => {
      const sourceArea = prev.find(a => a.id === sourceAreaId);
      const sourceModule = sourceArea?.modules.find(m => m.id === sourceModuleId);
      if (!sourceModule) return prev;
      const copiedCultures = JSON.parse(JSON.stringify(sourceModule.cultures)).map((c: any) => ({
        ...c, id: crypto.randomUUID(),
      }));
      return prev.map(area => {
        if (area.id !== targetAreaId) return area;
        return {
          ...area,
          modules: area.modules.map(m => {
            if (m.id !== targetModuleId) return m;
            return { ...m, cultures: [...m.cultures, ...copiedCultures] };
          }),
        };
      });
    });
  };

  const addTask = (task: Task) => setTasks(prev => [...prev, task]);
  const updateTask = (task: Task) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === task.id ? task : t);
      // Recurrence: if completing a recurring task, create next occurrence
      if (task.status === 'concluido') {
        const original = prev.find(t => t.id === task.id);
        if (original && original.status !== 'concluido' && task.recurrence && task.recurrence !== 'nenhuma') {
          const baseDate = new Date(task.date);
          if (task.recurrence === 'semanal') baseDate.setDate(baseDate.getDate() + 7);
          else if (task.recurrence === 'mensal') baseDate.setDate(baseDate.getDate() + 30);
          else if (task.recurrence === 'anual') baseDate.setFullYear(baseDate.getFullYear() + 1);
          const newTask: Task = {
            ...task,
            id: crypto.randomUUID(),
            status: 'pendente',
            date: baseDate.toISOString().slice(0, 10),
          };
          return [...updated, newTask];
        }
      }
      return updated;
    });
  };
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  // Auto-overdue check on mount and when tasks change
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setTasks(prev => {
      let changed = false;
      const updated = prev.map(t => {
        if ((t.status === 'pendente' || t.status === 'em_andamento') && t.date < today) {
          changed = true;
          return { ...t, status: 'atrasado' as const };
        }
        return t;
      });
      return changed ? updated : prev;
    });
  }, []);

  const addFinance = (entry: FinanceEntry) => setFinances(prev => [...prev, entry]);
  const updateFinance = (entry: FinanceEntry) => setFinances(prev => prev.map(f => f.id === entry.id ? entry : f));
  const deleteFinance = (id: string) => setFinances(prev => prev.filter(f => f.id !== id));

  const addHarvest = (harvest: Harvest) => setHarvests(prev => [...prev, harvest]);
  const updateHarvest = (harvest: Harvest) => setHarvests(prev => prev.map(h => h.id === harvest.id ? harvest : h));
  const deleteHarvest = (id: string) => setHarvests(prev => prev.filter(h => h.id !== id));

  return (
    <AppContext.Provider value={{
      areas, tasks, finances, harvests,
      addArea, updateArea, deleteArea, duplicateModule, copyCultures,
      addTask, updateTask, deleteTask,
      addFinance, updateFinance, deleteFinance,
      addHarvest, updateHarvest, deleteHarvest,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
