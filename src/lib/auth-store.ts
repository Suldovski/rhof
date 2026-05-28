import { useSyncExternalStore } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updatePassword,
  getAuth as getAuthForApp,
} from "firebase/auth";
import { initializeApp as initializeFirebaseApp, deleteApp } from "firebase/app";
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { auth, db, firebaseConfig } from "./firebase";
import {
  legacyRoleForUser,
  normalizeUserRecord,
  resolveUserType,
  type AppUser,
  type Role,
} from "./permissions";

export type { AppUser } from "./permissions";

interface AuthState {
  currentUser: AppUser | null;
  loading: boolean;
  isLocalStorage: boolean; // Demo user (GitHub Pages)
  allUsers: AppUser[];
}

// DEMO USER para GitHub Pages
const DEMO_USER: AppUser = {
  uid: "demo-user-001",
  name: "Demonstração",
  email: "demo@bucagrans.com.br",
  type: "main",
  role: "rh_matriz",
  workId: null,
  workName: null,
  obraId: null,
  obraNome: null,
  createdAt: new Date().toISOString(),
};

const DEMO_PASSWORD = "demo123";
const AUTH_STORAGE_KEY = "bucagrans_auth_demo";
const USERS_STORAGE_KEY = "bucagrans_users_local";

const initialState: AuthState = {
  currentUser: null,
  loading: true,
  isLocalStorage: false,
  allUsers: [],
};

let state: AuthState = initialState;
const listeners = new Set<() => void>();

function commit(next: AuthState) {
  state = next;
  if (next.isLocalStorage && next.currentUser) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next.currentUser));
  } else if (!next.currentUser) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  listeners.forEach((l) => l());
}

function resolveUserDoc(uid: string, data: Record<string, any>, fallbackEmail = ""): AppUser {
  return normalizeUserRecord(uid, data, {
    email: fallbackEmail,
    role: data.role,
  });
}

// Initialize Firebase auth listener
if (typeof window !== "undefined") {
  // Tentar localStorage primeiro (GitHub Pages demo)
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored) as AppUser;
      commit({ ...state, currentUser: user, loading: false, isLocalStorage: true });
    }
  } catch (err) {
    console.warn("Erro ao carregar usuário do localStorage:", err);
  }

  // Depois tentar Firebase
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, "usuarios", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          commit({
            ...state,
            currentUser: resolveUserDoc(firebaseUser.uid, userData, firebaseUser.email || ""),
            loading: false,
            isLocalStorage: false,
          });
        } else {
          commit({ ...state, currentUser: null, loading: false, isLocalStorage: false });
        }
      } catch (error) {
        console.error("Erro ao buscar dados do Firestore:", error);
        commit({ ...state, currentUser: null, loading: false, isLocalStorage: false });
      }
    } else {
      if (!state.currentUser || !state.isLocalStorage) {
        commit({ ...state, currentUser: null, loading: false, isLocalStorage: false });
      }
    }
  });
}

export const authStore = {
  current: () => state.currentUser,
  isAuthenticated: () => !!state.currentUser,
  isLoading: () => state.loading,
  allUsers: () => state.allUsers,

  login: async (email: string, password: string): Promise<AppUser | null> => {
    try {
      // Check demo user first (GitHub Pages)
      if (email.toLowerCase() === DEMO_USER.email.toLowerCase() && password === DEMO_PASSWORD) {
        console.log("✅ Demo user login (localStorage)");
        commit({ ...state, currentUser: DEMO_USER, loading: false, isLocalStorage: true });
        return DEMO_USER;
      }

      // Try Firebase
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userDocRef = doc(db, "usuarios", result.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const user = resolveUserDoc(result.user.uid, userData, result.user.email || "");
          commit({ ...state, currentUser: user, loading: false, isLocalStorage: false });
          return user;
        }
      } catch (firebaseError: any) {
        console.warn("Firebase login falhou:", firebaseError.message);
      }

      return null;
    } catch (error) {
      console.error("Login error:", error);
      return null;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn("Firebase logout falhou:", error);
    }
    commit({ ...state, currentUser: null, loading: false, isLocalStorage: false });
  },

  /**
   * Busca todos os usuários do Firestore com fallback para localStorage
   */
  fetchAllUsers: async (): Promise<AppUser[]> => {
    try {
      const usersRef = collection(db, "usuarios");
      const querySnapshot = await getDocs(usersRef);
      const users: AppUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push(resolveUserDoc(doc.id, data));
      });
      // Salvar no localStorage também
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      } catch {}
      commit({ ...state, allUsers: users });
      return users;
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error.message);
      
      // Fallback: tenta carregar do localStorage
      try {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) {
          const users = JSON.parse(stored) as AppUser[];
          commit({ ...state, allUsers: users });
          return users;
        }
      } catch {}
      
      // Último recurso: se estiver usando demo user, retorna demo user
      if (state.isLocalStorage && state.currentUser) {
        const demoUsers: AppUser[] = [state.currentUser];
        commit({ ...state, allUsers: demoUsers });
        return demoUsers;
      }
      
      return [];
    }
  },

  /**
   * Cria um novo usuário no Firebase Authentication e Firestore.
   * Para cliente de obra, sem senha (apenas email).
   */
  create: async (data: {
    email: string;
    password?: string; // opcional para cliente
    name: string;
    type: "main" | "work";
    workId?: string | null;
    workName?: string | null;
  }): Promise<AppUser | null> => {
    try {
      // Verificar se email já existe
      const usersRef = collection(db, "usuarios");
      const emailQuery = query(usersRef, where("email", "==", data.email));
      const existingUsers = await getDocs(emailQuery);
      
      if (!existingUsers.empty) {
        throw new Error("Um usuário com este e-mail já existe.");
      }

      // Criar usuário Firebase Auth usando um app/auth secundário para não alterar a sessão principal
      const password = data.password || Math.random().toString(36).slice(-16);
      const secondaryAppName = `secondary-${Date.now()}`;
      const secondaryApp = initializeFirebaseApp(firebaseConfig as any, secondaryAppName);
      const secondaryAuth = getAuthForApp(secondaryApp);
      const result = await createUserWithEmailAndPassword(secondaryAuth, data.email, password);
      // sign out secondary auth and delete app instance to clean up
      try { await signOut(secondaryAuth as any); } catch (e) {}
      try { await deleteApp(secondaryApp); } catch (e) {}

      const workId = data.type === "work" ? data.workId ?? null : null;
      const workName = data.type === "work" ? data.workName ?? null : null;
      const role = legacyRoleForUser(data.type, workId);

      // Salvar dados no Firestore
      const userData: Omit<AppUser, "uid"> = {
        name: data.name,
        email: data.email,
        type: data.type,
        workId,
        workName,
        role,
        obraId: workId,
        obraNome: workName,
        sector: null,
        headquarter: null,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "usuarios", result.user.uid), userData);

      const user: AppUser = {
        uid: result.user.uid,
        ...userData,
      };

      // Atualizar lista de usuários
      await authStore.fetchAllUsers();

      return user;
    } catch (error) {
      console.error("Create user error:", error);
      throw error;
    }
  },

  /**
   * Atualiza um usuário existente
   */
  update: async (uid: string, patch: Partial<AppUser>): Promise<void> => {
    try {
      const userRef = doc(db, "usuarios", uid);
      const current = state.allUsers.find((user) => user.uid === uid) ?? state.currentUser;
      const merged = normalizeUserRecord(uid, { ...(current as any), ...(patch as any) }, current ?? undefined);
      const nextPayload: Omit<AppUser, "uid"> = {
        name: merged.name ?? "",
        email: merged.email ?? "",
        type: resolveUserType(merged),
        workId: merged.workId ?? null,
        workName: merged.workName ?? null,
        role: merged.role ?? legacyRoleForUser(resolveUserType(merged), merged.workId ?? null),
        obraId: merged.workId ?? null,
        obraNome: merged.workName ?? null,
        sector: null,
        headquarter: null,
        createdAt: merged.createdAt ?? new Date().toISOString(),
      };
      await updateDoc(userRef, nextPayload as any);
      // Atualizar lista de usuários
      await authStore.fetchAllUsers();
    } catch (error) {
      console.error("Update user error:", error);
      throw error;
    }
  },

  /**
   * Remove um usuário
   */
  remove: async (uid: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, "usuarios", uid));
      // Atualizar lista de usuários
      await authStore.fetchAllUsers();
    } catch (error) {
      console.error("Remove user error:", error);
      throw error;
    }
  },

  /**
   * Verifica se um email já está registrado (inclusive clientes).
   */
  emailExists: async (email: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, "usuarios");
      const emailQuery = query(usersRef, where("email", "==", email));
      const result = await getDocs(emailQuery);
      return !result.empty;
    } catch (error) {
      console.error("Email check error:", error);
      return false;
    }
  },

  /**
   * Atualiza a senha do usuário autenticado
   */
  updatePassword: async (uid: string, newPassword: string): Promise<void> => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || firebaseUser.uid !== uid) {
        throw new Error("Você só pode alterar sua própria senha.");
      }
      await updatePassword(firebaseUser, newPassword);
    } catch (error) {
      console.error("Update password error:", error);
      throw error;
    }
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuth() {
  const currentUser = useSyncExternalStore(
    subscribe,
    () => state.currentUser,
    () => initialState.currentUser
  );

  const loading = useSyncExternalStore(
    subscribe,
    () => state.loading,
    () => initialState.loading
  );

  const isLocalStorage = useSyncExternalStore(
    subscribe,
    () => state.isLocalStorage,
    () => false
  );

  return {
    currentUser,
    loading,
    currentUserId: currentUser?.uid,
    isAuthenticated: !!currentUser,
    isLocalStorage,
  };
}

export function useAllUsers() {
  const allUsers = useSyncExternalStore(
    subscribe,
    () => state.allUsers,
    () => initialState.allUsers
  );

  return allUsers;
}
