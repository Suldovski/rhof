import { useSyncExternalStore } from "react";

export interface DismissalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  site: string;
  reason: string;
  requestedBy: string;
  status: "pendente" | "aprovada" | "recusada";
  createdAt: string;
  resolvedAt?: string;
}

const KEY = "bucagrans.dismissals.v1";

let state: DismissalRequest[] = (() => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
})();

const listeners = new Set<() => void>();
function commit(next: DismissalRequest[]) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export const dismissalsStore = {
  list: () => state,
  pending: () => state.filter((d) => d.status === "pendente"),
  add: (data: Omit<DismissalRequest, "id" | "status" | "createdAt">) => {
    const req: DismissalRequest = {
      ...data,
      id: `dem-${Date.now()}`,
      status: "pendente",
      createdAt: new Date().toISOString(),
    };
    commit([req, ...state]);
    return req;
  },
  resolve: (id: string, status: "aprovada" | "recusada") => {
    commit(state.map((d) => d.id === id ? { ...d, status, resolvedAt: new Date().toISOString() } : d));
  },
  remove: (id: string) => commit(state.filter((d) => d.id !== id)),
};

function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
export function useDismissals(): DismissalRequest[] {
  return useSyncExternalStore(subscribe, () => state, () => []);
}
