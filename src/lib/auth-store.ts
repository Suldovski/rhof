import { useSyncExternalStore } from "react";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "Admin" | "RH" | "Operacional";
  createdAt: string;
}

interface AuthState {
  users: AppUser[];
  currentUserId: string | null;
}

const KEY = "bucagrans.auth.v1";

const seed: AuthState = {
  users: [
    {
      id: "u-admin",
      name: "Carla Mendes",
      email: "admin@bucagrans.com.br",
      password: "admin123",
      role: "Admin",
      createdAt: new Date().toISOString(),
    },
  ],
  currentUserId: null,
};

let state: AuthState = (() => {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // ensure at least the seed admin exists
      if (!parsed.users || parsed.users.length === 0) return seed;
      return parsed;
    }
  } catch {}
  return seed;
})();

const listeners = new Set<() => void>();

function commit(next: AuthState) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

export const authStore = {
  list: () => state.users,
  current: () => state.users.find((u) => u.id === state.currentUserId) ?? null,
  isAuthenticated: () => !!state.currentUserId,

  login: (email: string, password: string): AppUser | null => {
    const user = state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!user) return null;
    commit({ ...state, currentUserId: user.id });
    return user;
  },

  logout: () => commit({ ...state, currentUserId: null }),

  create: (data: Omit<AppUser, "id" | "createdAt">) => {
    if (state.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error("Já existe um usuário com este e-mail.");
    }
    const user: AppUser = {
      ...data,
      id: `u-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    commit({ ...state, users: [...state.users, user] });
    return user;
  },

  update: (id: string, patch: Partial<Omit<AppUser, "id" | "createdAt">>) => {
    commit({
      ...state,
      users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    });
  },

  remove: (id: string) => {
    if (id === state.currentUserId) return;
    commit({ ...state, users: state.users.filter((u) => u.id !== id) });
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuth() {
  return useSyncExternalStore(subscribe, () => state, () => seed);
}
