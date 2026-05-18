import { useSyncExternalStore } from "react";

export interface DocTemplate {
  id: string;
  name: string;
  category: "ficha-registro" | "termo" | "contrato" | "outro";
  filename: string;
  mime: string;
  size: number;
  /** Data URL base64 */
  data: string;
  uploadedAt: string;
  obraId?: string; // termos vinculados a obras
}

const KEY = "bucagrans.doc-templates.v1";

let state: DocTemplate[] = (() => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
})();

const listeners = new Set<() => void>();
function commit(next: DocTemplate[]) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export const docTemplatesStore = {
  list: () => state,
  add: (tpl: Omit<DocTemplate, "id" | "uploadedAt">) => {
    const t: DocTemplate = { ...tpl, id: `doc-${Date.now()}`, uploadedAt: new Date().toISOString() };
    commit([...state, t]);
    return t;
  },
  remove: (id: string) => commit(state.filter((t) => t.id !== id)),
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDocTemplates(): DocTemplate[] {
  return useSyncExternalStore(subscribe, () => state, () => []);
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
