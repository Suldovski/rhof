import { isClienteObra } from "./permissions";
import type { AppUser } from "./auth-store";

/**
 * Verificar se o usuário é um cliente de obra
 */
export const isClientUser = (user: AppUser | null | undefined): boolean => {
  return !!user && isClienteObra(user.role);
};

/**
 * Obter o ID da obra que o cliente pode visualizar
 */
export const getClientObraId = (user: AppUser | null | undefined): string | null => {
  if (!isClientUser(user)) return null;
  return user?.workId || user?.obraId || null;
};

/**
 * Verificar se um cliente pode visualizar uma obra específica
 */
export const canClientViewObra = (user: AppUser | null | undefined, obraId: string): boolean => {
  if (!isClientUser(user)) return false;
  return (user?.workId || user?.obraId) === obraId;
};

/**
 * URLs bloqueadas para clientes
 */
export const getClientRestrictedUrls = (): string[] => {
  return [
    "/funcionarios",
    "/folha-salarial",
    "/horas-extras",
    "/rdv",
    "/admin/demissoes",
    "/configuracoes",
  ];
};

/**
 * URLs permitidas para clientes
 */
export const getClientAllowedUrls = (): string[] => {
  return [
    "/",
    "/obras",
  ];
};

/**
 * Verificar se uma URL é permitida para clientes
 */
export const isClientAllowedUrl = (pathname: string, user: AppUser | null | undefined): boolean => {
  if (!isClientUser(user)) return true; // Não é cliente, pode acessar

  const obraId = getClientObraId(user);
  const restricted = getClientRestrictedUrls();
  const allowed = getClientAllowedUrls();

  // Permite detalhes de funcionário da própria obra, mas mantém lista/cadastro bloqueados
  if (pathname.startsWith("/funcionarios/") && pathname !== "/funcionarios/novo") {
    return true;
  }

  // Se está em URL restrita, não pode
  if (restricted.some((url) => pathname === url || pathname.startsWith(url + "/"))) {
    return false;
  }

  if (pathname === "/obras" && obraId) {
    return true;
  }

  if (obraId && (pathname === `/obras/${obraId}` || pathname.startsWith(`/obras/${obraId}/`))) {
    return true;
  }

  // Se está em URL permitida, pode
  if (allowed.some((url) => pathname === url || pathname.startsWith(url + "/"))) {
    return true;
  }

  // Padrão: bloqueia
  return false;
};

/**
 * Redirecionar cliente para sua obra quando fazer login
 */
export const getClientRedirectUrl = (user: AppUser | null | undefined): string => {
  if (!isClientUser(user)) return "/";
  const obraId = user?.workId || user?.obraId;
  if (!obraId) return "/";
  return `/obras/${obraId}`;
};
