import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./auth-store";
import * as Permissions from "./permissions";
import { toast } from "sonner";

/**
 * Hook para proteger rotas baseado em permissões de role
 */
export function useRouteProtection(
  requiredPermissionCheck: (role?: string) => boolean,
  routeName: string = "esta página"
) {
  const auth = useAuth();
  const navigate = useNavigate();

  // Redireciona se o usuário não tem permissão
  if (!auth.loading && auth.currentUser) {
    if (!requiredPermissionCheck(auth.currentUser.role)) {
      if (typeof window !== "undefined") {
        toast.error(`Você não tem permissão para acessar ${routeName}.`);
        navigate({ to: "/" });
      }
      return false;
    }
  }

  return true;
}

/**
 * Helpers para verificações comuns
 */
export const roleChecks = {
  funcionarios: Permissions.canAccessFuncionarios,
  folhaSalarial: Permissions.canAccessFolhaSalarial,
  horasExtras: Permissions.canAccessHorasExtras,
  rdv: Permissions.canAccessRDV,
  documentos: Permissions.canAccessDocumentos,
  demissoes: Permissions.canAccessDemissoes,
  obras: Permissions.canAccessObras,
  painel: Permissions.canAccessPainel,
};
