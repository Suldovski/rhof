import { useSyncExternalStore } from "react";

export interface RdvEntry {
  employeeId: string;
  numero: string;
  valor: number;
}

export interface RdvPayment {
  id: string;
  data: string; // YYYY-MM-DD
  descricao: string;
  entries: RdvEntry[];
  createdAt: string;
}

const KEY = "bucagrans.rdv.v1";

function load(): RdvPayment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

let state: RdvPayment[] = load();
const listeners = new Set<() => void>();

function commit(next: RdvPayment[]) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export const rdvStore = {
  list: () => state,
  get: (id: string) => state.find((p) => p.id === id),
  create: (data: string, descricao = "") => {
    const p: RdvPayment = {
      id: `rdv-${Date.now()}`,
      data,
      descricao,
      entries: [],
      createdAt: new Date().toISOString(),
    };
    commit([p, ...state]);
    return p;
  },
  update: (id: string, patch: Partial<Omit<RdvPayment, "id" | "createdAt">>) => {
    commit(state.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  },
  remove: (id: string) => commit(state.filter((p) => p.id !== id)),
  addEmployees: (id: string, employeeIds: string[]) => {
    commit(state.map((p) => {
      if (p.id !== id) return p;
      const existing = new Set(p.entries.map((e) => e.employeeId));
      const toAdd = employeeIds.filter((eid) => !existing.has(eid));
      return {
        ...p,
        entries: [...p.entries, ...toAdd.map((eid) => ({ employeeId: eid, numero: "", valor: 0 }))],
      };
    }));
  },
  removeEmployee: (id: string, employeeId: string) => {
    commit(state.map((p) => p.id === id ? { ...p, entries: p.entries.filter((e) => e.employeeId !== employeeId) } : p));
  },
  updateEntry: (id: string, employeeId: string, patch: Partial<RdvEntry>) => {
    commit(state.map((p) => {
      if (p.id !== id) return p;
      return { ...p, entries: p.entries.map((e) => e.employeeId === employeeId ? { ...e, ...patch } : e) };
    }));
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const empty: RdvPayment[] = [];
export function useRdvPayments(): RdvPayment[] {
  return useSyncExternalStore(subscribe, () => state, () => empty);
}

export function useRdvPayment(id: string): RdvPayment | undefined {
  return useRdvPayments().find((p) => p.id === id);
}
