import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: ReactNode;
  /** Caminho da tela de login (default: /login). Ajuste para seu router. */
  loginPath?: string;
}

/**
 * Guard global: redireciona para /login se não autenticado.
 * Funciona com qualquer router (window.location). Substitua o redirect
 * pelo seu navigate() (React Router / TanStack Router) se preferir.
 */
export function ProtectedRoute({ children, loginPath = "/login" }: Props) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined") {
      if (window.location.pathname !== loginPath) {
        window.location.replace(loginPath);
      }
    }
  }, [user, loading, loginPath]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
