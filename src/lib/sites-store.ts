import { useSyncExternalStore } from "react";
import { authStore } from "./auth-store";
import { isClienteObra, isRhObra, isWorkUser, getObraIdFromClienteObra, getUserWorkId, isMainUser } from "./permissions";
import { db } from "./firebase";
import { collection, getDocs, onSnapshot, setDoc, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";

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
  { id: "residencial-vila-nova", name: "Residencial Vila Nova", status: "Em execução", start: "2023-08-01", manager: "Antônio Silva", address: "Rua das Flores, 100 — São Paulo, SP", description: "Condomínio residencial de 120 unidades." },
  { id: "edificio-atlantico", name: "Edifício Atlântico", status: "Estrutura", start: "2024-02-12", manager: "Marina Lima", address: "Av. Atlântica, 2200 — Santos, SP", description: "Torre comercial com 30 andares." },
  { id: "galpao-industrial-sul", name: "Galpão Industrial Sul", status: "Fundação", start: "2025-01-20", manager: "Marina Lima", address: "Rod. Anchieta, km 32 — Cubatão, SP", description: "Complexo logístico de 15.000 m²." },
  { id: "sede-administrativa", name: "Sede Administrativa", status: "Operação", start: "2015-03-01", manager: "Carla Mendes", address: "Av. Paulista, 1500 — São Paulo, SP", description: "Sede da Bucagrans." },
];

let state: Site[] = (() => {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((p) => normalizeSite(p));
        }
        return seed;
      } catch (e) {
        return seed;
      }
    }
  } catch {}
  return seed;
})();
const listeners = new Set<() => void>();

// Try to sync with Firestore on clients. If Firestore is reachable, prefer its data as
// source of truth and subscribe to real-time updates. Do not throw if network/rules
// prevent access — keep local fallback.
if (typeof window !== "undefined") {
  (async () => {
    try {
      const col = collection(db, "obras");
      // initial load
      const snap = await getDocs(col);
      if (!snap.empty) {
        const remote = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        state = remote.map((r) => normalizeSite(r)) as Site[];
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
        listeners.forEach((l) => l());
      }
      // subscribe to changes
      onSnapshot(col, (snapshot) => {
        const remote = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        state = remote.map((r) => normalizeSite(r)) as Site[];
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
        listeners.forEach((l) => l());
      });
    } catch (err) {
      // fail silently and keep local seed/state
    }
  })();
}


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

function normalizeSite(raw: any): Site {
  if (!raw) return { id: raw?.id || `obra-${Date.now()}`, name: "", status: "Planejamento", start: "", manager: "", address: "", description: "" };
  return {
    id: raw.id || raw._id || slugify(raw.name ?? raw.nome ?? (raw.title || "obra")),
    name: raw.name ?? raw.nome ?? raw.title ?? "",
    status: raw.status ?? raw.estado ?? "Planejamento",
    start: raw.start ?? raw.inicio ?? raw.data ?? "",
    manager: raw.manager ?? raw.responsavel ?? raw.coordinator ?? "",
    address: raw.address ?? raw.endereco ?? raw.location ?? "",
    description: raw.description ?? raw.descricao ?? raw.note ?? "",
  };
}

export const sitesStore = {
  list: () => state,
  get: (id: string) => state.find((s) => s.id === id),
  add: (site: Omit<Site, "id"> & { id?: string }) => {
    const id = site.id || slugify(site.name) || `obra-${Date.now()}`;
    const newSite: Site = { ...site, id };
    commit([...state, newSite]);
    // Try to persist to Firestore; do it asynchronously but don't block the UI.
    try {
      setDoc(doc(db, "obras", id), { name: newSite.name, status: newSite.status, start: newSite.start, manager: newSite.manager, address: newSite.address ?? null, description: newSite.description ?? null }).catch(() => {});
    } catch (e) {
      // ignore
    }
    // Dispara listeners sincronamente para garantir que a nova obra aparece imediatamente
    listeners.forEach((l) => l());
    return id;
  },
  update: (id: string, patch: Partial<Site>) => {
    commit(state.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    try {
      updateDoc(doc(db, "obras", id), patch as any).catch(() => {});
    } catch (e) {}
  },
  remove: (id: string) => {
    commit(state.filter((s) => s.id !== id));
    try {
      deleteDoc(doc(db, "obras", id)).catch(() => {});
    } catch (e) {}
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSites(): Site[] {
  // Return the sites filtered according to the current user's scope:
  // - matriz (main): see all
  // - rh_obra / work users: see only their own obra
  // - cliente_obra: see only their obra
  const all = useSyncExternalStore(subscribe, () => state, () => seed);
  try {
    const user = authStore.current();
    if (!user) return all;
    if (isMainUser(user)) return all;
    if (isClienteObra(user.role)) {
      const id = getObraIdFromClienteObra(user.role ?? "");
      return id ? all.filter((s) => s.id === id) : [];
    }
    if (isRhObra(user) || isWorkUser(user)) {
      const id = getUserWorkId(user as any);
      return id ? all.filter((s) => s.id === id) : [];
    }
    return all;
  } catch (e) {
    return all;
  }
}

export function useSite(id: string): Site | undefined {
  const all = useSites();
  return all.find((s) => s.id === id);
}
