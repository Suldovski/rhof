import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { normalizeUserRecord, type AppUser, type Role } from "@/lib/permissions";

interface AuthContextValue {
  user: AppUser | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Carrega o documento do usuário em /usuarios/{uid}
      const snap = await getDoc(doc(db, "usuarios", fbUser.uid));
      if (snap.exists()) {
        const data = snap.data() as Omit<AppUser, "uid">;
        setUser(normalizeUserRecord(fbUser.uid, data as Record<string, any>, {
          email: fbUser.email ?? "",
        }));
      } else {
        // Usuário autenticado mas sem perfil no Firestore
        setUser({
          uid: fbUser.uid,
          name: fbUser.displayName ?? "",
          email: fbUser.email ?? "",
          type: "main",
          role: "rh_matriz",
          workId: null,
          workName: null,
          obraId: null,
          obraNome: null,
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, role: user?.role ?? null, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
