import { useSyncExternalStore } from "react";

const KEY = "bucagrans.payroll.v1";

type PayrollMap = Record<string, number>; // employeeId -> salary value

let state: PayrollMap = (() => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
})();

const listeners = new Set<() => void>();

function commit(next: PayrollMap) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export const payrollStore = {
  get: (id: string) => state[id],
  set: (id: string, value: number) => commit({ ...state, [id]: value }),
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const emptyMap: PayrollMap = {};
export function usePayroll(): PayrollMap {
  return useSyncExternalStore(subscribe, () => state, () => emptyMap);
}
