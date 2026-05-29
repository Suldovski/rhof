import { useSyncExternalStore } from "react";

export interface OvertimeEntry {
  employeeId: string;
  employeeName: string;
  hd50: number;
  hd100: number;
  hn50: number;
  hn100: number;
  salarioHora: number;
}

export interface OvertimePeriod {
  id: string;
  periodo: string;
  createdAt: string;
  entries: OvertimeEntry[];
  obraId?: string;
  obraNome?: string;
}

const KEY = "bucagrans.overtime.v1";

let state: OvertimePeriod[] = (() => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OvertimePeriod[];
      return parsed.map((period) => ({
        ...period,
        entries: (period.entries || []).map((entry: any) => ({
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          hd50: Number(entry.hd50 ?? entry.horas50 ?? 0),
          hd100: Number(entry.hd100 ?? entry.horas100 ?? 0),
          hn50: Number(entry.hn50 ?? entry.noturnas ?? 0),
          hn100: Number(entry.hn100 ?? 0),
          salarioHora: Number(entry.salarioHora ?? 0),
        })),
      }));
    }
  } catch {}
  return [];
})();

const listeners = new Set<() => void>();
function commit(next: OvertimePeriod[]) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export const overtimeStore = {
  list: () => state,
  get: (id: string) => state.find((p) => p.id === id),
  add: (periodo: string, obra?: { id: string; nome: string }) => {
    const p: OvertimePeriod = {
      id: `oh-${Date.now()}`,
      periodo,
      createdAt: new Date().toISOString(),
      entries: [],
      obraId: obra?.id,
      obraNome: obra?.nome,
    };
    commit([p, ...state]);
    return p;
  },
  update: (id: string, patch: Partial<OvertimePeriod>) => {
    commit(state.map((p) => p.id === id ? { ...p, ...patch } : p));
  },
  remove: (id: string) => commit(state.filter((p) => p.id !== id)),
  addEmployees: (
    id: string,
    employees: Array<{ id: string; name: string; salarioHora?: number; salary?: number }>,
  ) => {
    commit(state.map((p) => {
      if (p.id !== id) return p;
      const existing = new Set(p.entries.map((e) => e.employeeId));
      const toAdd = employees
        .filter((e) => !existing.has(e.id))
        .map((e) => ({
          employeeId: e.id,
          employeeName: e.name,
          hd50: 0,
          hd100: 0,
          hn50: 0,
          hn100: 0,
          salarioHora: e.salarioHora || (e.salary ? e.salary / 220 : 0),
        }));
      return { ...p, entries: [...p.entries, ...toAdd] };
    }));
  },
};

function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
export function useOvertime(): OvertimePeriod[] {
  return useSyncExternalStore(subscribe, () => state, () => []);
}
