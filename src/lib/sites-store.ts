import { useSyncExternalStore } from "react";

export interface Site {
  id: string;
  name: string;
  status: string;
  start: string;
  manager: string;
  address?: string;
  description?: string;
}

const KEY = "bucagrans.sites.v1";

const seed: Site[] = [
  { id: "residencial-vila-nova", name: "Residencial Vila Nova", status: "Em execução", start: "2023-08-01", manager: "Antônio Silva", address: "Rua das Flores, 100 — São Paulo, SP", description: "Edifício residencial de 12 andares com 48 unidades." },
  { id: "edificio-atlantico", name: "Edifício Atlântico", status: "Estrutura", start: "2024-02-12", manager: "Marina Lima", address: "Av. Atlântica, 2200 — Santos, SP", description: "Torre comercial de 18 pavimentos." },
  { id: "galpao-industrial-sul", name: "Galpão Industrial Sul", status: "Fundação", start: "2025-01-20", manager: "Marina Lima", address: "Rod. Anchieta, km 32 — Cubatão, SP", description: "Galpão logístico de 8.000 m²." },
  { id: "sede-administrativa", name: "Sede Administrativa", status: "Operação", start: "2015-03-01", manager: "Carla Mendes", address: "Av. Paulista, 1500 — São Paulo, SP", description: "Sede corporativa da Bucagrans." },
];

let state: Site[] = (() => {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed;
})();

const listeners = new Set<() => void>();

function commit(next: Site[]) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const sitesStore = {
  list: () => state,
  get: (id: string) => state.find((s) => s.id === id),
  add: (site: Omit<Site, "id"> & { id?: string }) => {
    const id = site.id || slugify(site.name) || `obra-${Date.now()}`;
    commit([...state, { ...site, id }]);
    return id;
  },
  update: (id: string, patch: Partial<Site>) => {
    commit(state.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  },
  remove: (id: string) => {
    commit(state.filter((s) => s.id !== id));
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSites(): Site[] {
  return useSyncExternalStore(subscribe, () => state, () => seed);
}

export function useSite(id: string): Site | undefined {
  const all = useSites();
  return all.find((s) => s.id === id);
}
