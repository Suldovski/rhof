import { useSyncExternalStore } from "react";

export interface Horario {
  id: string;
  nome: string;
}

const KEY = "bucagrans.horarios.v1";

const seed: Horario[] = [
  { id: "h1", nome: "44H 2ª–6ª 07:00–17:00" },
  { id: "h2", nome: "40H 2ª–6ª 08:00–17:00" },
  { id: "h3", nome: "36H ESCALA 6X1" },
];

let state: Horario[] = (() => {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p;
    }
  } catch {}
  return seed;
})();

const listeners = new Set<() => void>();
function commit(next: Horario[]) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export const horariosStore = {
  list: () => state,
  add: (nome: string) => {
    const h: Horario = { id: `h-${Date.now()}`, nome: nome.toUpperCase().trim() };
    commit([...state, h]);
    return h;
  },
  update: (id: string, nome: string) =>
    commit(state.map((h) => (h.id === id ? { ...h, nome: nome.toUpperCase().trim() } : h))),
  remove: (id: string) => commit(state.filter((h) => h.id !== id)),
};

function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
export function useHorarios(): Horario[] {
  return useSyncExternalStore(subscribe, () => state, () => seed);
}
