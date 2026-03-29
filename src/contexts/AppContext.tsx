import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Area, Task, Module, Culture, Input, AdditionalCost, FinanceEntry } from '@/types/agroforest';

interface AppState {
  areas: Area[];
  tasks: Task[];
  finances: FinanceEntry[];
}

interface AppContextType extends AppState {
  addArea: (area: Area) => void;
  updateArea: (area: Area) => void;
  deleteArea: (id: string) => void;
  duplicateModule: (areaId: string, moduleId: string) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  addFinance: (entry: FinanceEntry) => void;
  updateFinance: (entry: FinanceEntry) => void;
  deleteFinance: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'agrofloresta-planner-data';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { areas: [], tasks: [] };
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<Area[]>(() => loadState().areas);
  const [tasks, setTasks] = useState<Task[]>(() => loadState().tasks);

  useEffect(() => {
    saveState({ areas, tasks });
  }, [areas, tasks]);

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
      return { ...area, modules: [...area.modules, newModule] };
    }));
  };

  const addTask = (task: Task) => setTasks(prev => [...prev, task]);
  const updateTask = (task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  return (
    <AppContext.Provider value={{
      areas, tasks,
      addArea, updateArea, deleteArea, duplicateModule,
      addTask, updateTask, deleteTask,
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
