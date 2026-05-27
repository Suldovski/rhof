import { useSyncExternalStore } from "react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export interface WorkOption {
  id: string;
  name: string;
}

const WORKS_KEY = "bucagrans.works.v1";

const seed: WorkOption[] = [];

let state: WorkOption[] = (() => {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(WORKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeWork(item))
          .filter((item): item is WorkOption => !!item.id && !!item.name);
      }
    }
  } catch {}
  return seed;
})();

const listeners = new Set<() => void>();

function commit(next: WorkOption[]) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(WORKS_KEY, JSON.stringify(state));
    } catch {}
  }
  listeners.forEach((listener) => listener());
}

function normalizeWork(raw: any): WorkOption | null {
  if (!raw) return null;
  const id = String(raw.id ?? raw._id ?? "").trim();
  const name = String(raw.name ?? raw.nome ?? raw.title ?? "").trim();
  if (!id || !name) return null;
  return { id, name };
}

async function loadWorks() {
  const collections = ["works", "obras"];
  for (const collectionName of collections) {
    try {
      const snap = await getDocs(collection(db, collectionName));
      const mapped = snap.docs
        .map((doc) => normalizeWork({ id: doc.id, ...(doc.data() as any) }))
        .filter((item): item is WorkOption => !!item);
      if (mapped.length > 0) {
        commit(mapped);
        return;
      }
    } catch {}
  }
}

if (typeof window !== "undefined") {
  void loadWorks();
  try {
    const col = collection(db, "works");
    onSnapshot(col, (snapshot) => {
      const mapped = snapshot.docs
        .map((doc) => normalizeWork({ id: doc.id, ...(doc.data() as any) }))
        .filter((item): item is WorkOption => !!item);
      if (mapped.length > 0) {
        commit(mapped);
      }
    });
  } catch {}
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useWorks(): WorkOption[] {
  return useSyncExternalStore(subscribe, () => state, () => seed);
}
