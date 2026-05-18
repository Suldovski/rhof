import { useSyncExternalStore } from "react";

const KEY = "bucagrans.payroll.v2";

/** Mapa por mês (YYYY-MM) → { employeeId → valor pago } */
type PayrollMap = Record<string, Record<string, number>>;

function migrateLegacy(): PayrollMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem("bucagrans.payroll.v1");
    if (legacy) {
      const month = currentMonth();
      const parsed = JSON.parse(legacy) as Record<string, number>;
      return { [month]: parsed };
    }
  } catch {}
  return {};
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

let state: PayrollMap = migrateLegacy();

const listeners = new Set<() => void>();

function commit(next: PayrollMap) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export const payrollStore = {
  get: (month: string, id: string) => state[month]?.[id],
  set: (month: string, id: string, value: number) => {
    const m = { ...(state[month] ?? {}), [id]: value };
    commit({ ...state, [month]: m });
  },
  months: () => Object.keys(state).sort().reverse(),
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const emptyMap: PayrollMap = {};
export function usePayroll(): PayrollMap {
  return useSyncExternalStore(subscribe, () => state, () => emptyMap);
}
