import { useSyncExternalStore } from "react";

export interface OvertimeEntry {
  employeeId: string;
  employeeName: string;
  horas50: number;
  horas100: number;
  noturnas: number;
  salarioHora: number;
}

export interface OvertimePeriod {
  id: string;
  periodo: string;
  createdAt: string;
  entries: OvertimeEntry[];
}

const KEY = "bucagrans.overtime.v1";

let state: OvertimePeriod[] = (() => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
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
  add: (periodo: string) => {
    const p: OvertimePeriod = {
      id: `oh-${Date.now()}`,
      periodo,
      createdAt: new Date().toISOString(),
      entries: [],
    };
    commit([p, ...state]);
    return p;
  },
  update: (id: string, patch: Partial<OvertimePeriod>) => {
    commit(state.map((p) => p.id === id ? { ...p, ...patch } : p));
  },
  remove: (id: string) => commit(state.filter((p) => p.id !== id)),
};

function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
export function useOvertime(): OvertimePeriod[] {
  return useSyncExternalStore(subscribe, () => state, () => []);
}
