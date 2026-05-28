/**
 * Hierarquia completa de usuários e regras de acesso (LGPD)
 * 
 * Tipos de usuário:
 * - rh_matriz: RH da matriz (acesso completo)
 * - administrativo_matriz: Administrativo da matriz (acesso completo, financeiro não edita nada)
 * - financeiro_matriz: Financeiro da matriz (acesso read-only a folha/rdv/demissões)
 * - rh_obra_<obraId>: RH específico de cada obra (vê apenas sua obra)
 * - cliente_obra_<obraId>: Cliente de cada obra (vê apenas sua obra, read-only, sem menu completo)
 */

export type Role = 
  | "rh_matriz" 
  | "administrativo_matriz" 
  | "financeiro_matriz"
  | string; // rh_obra_<obraId> or cliente_obra_<obraId>

export type UserType = "main" | "work";

export interface AppUser {
  uid: string;
  nome?: string;
  name?: string;
  email: string;
  type: UserType;
  workId?: string | null;
  workName?: string | null;
  role?: Role;
  obraId?: string | null;
  obraNome?: string | null;
  sector?: string | null;
  headquarter?: string | null;
  createdAt?: string;
}

type UserLike = AppUser | Role | null | undefined;

export function resolveUserType(userLike?: UserLike): UserType {
  if (!userLike) return "main";
  if (typeof userLike === "string") {
    if (
      userLike === "rh_matriz" ||
      userLike === "administrativo_matriz" ||
      userLike === "financeiro_matriz"
    ) {
      return "main";
    }
    if (
      userLike === "work" ||
      userLike.startsWith("rh_obra_") ||
      userLike.startsWith("cliente_obra_")
    ) {
      return "work";
    }
    return "main";
  }

  if (userLike.type === "main" || userLike.type === "work") {
    return userLike.type;
  }

  if (
    userLike.role === "rh_matriz" ||
    userLike.role === "administrativo_matriz" ||
    userLike.role === "financeiro_matriz"
  ) {
    return "main";
  }

  if (userLike.workId || userLike.obraId || userLike.workName || userLike.obraNome) {
    return "work";
  }

  return resolveUserType(userLike.role);
}

export const isMainUser = (userLike?: UserLike) => resolveUserType(userLike) === "main";
export const isWorkUser = (userLike?: UserLike) => resolveUserType(userLike) === "work";

export const getUserWorkId = (user?: AppUser | null) => user?.workId ?? user?.obraId ?? null;
export const getUserWorkName = (user?: AppUser | null) => user?.workName ?? user?.obraNome ?? null;

export const legacyRoleForUser = (type: UserType, workId?: string | null): Role => {
  if (type === "work") return `rh_obra_${workId ?? "obra"}`;
  return "rh_matriz";
};

export const normalizeUserRecord = (
  uid: string,
  data: Record<string, any>,
  fallback?: Partial<AppUser>,
): AppUser => {
  const type = resolveUserType(data.type ?? data.role ?? fallback?.type);
  const workId = (data.workId ?? data.obraId ?? fallback?.workId ?? fallback?.obraId ?? null) as string | null;
  const workName = (data.workName ?? data.obraNome ?? fallback?.workName ?? fallback?.obraNome ?? null) as string | null;
  const role = (typeof data.role === "string" && data.role) ? data.role : legacyRoleForUser(type, workId);

  return {
    uid,
    name: data.name ?? data.nome ?? fallback?.name ?? fallback?.nome ?? "",
    email: data.email ?? fallback?.email ?? "",
    type,
    workId,
    workName,
    role,
    obraId: workId,
    obraNome: workName,
    sector: data.sector ?? fallback?.sector ?? null,
    headquarter: data.headquarter ?? fallback?.headquarter ?? null,
    createdAt: data.createdAt ?? fallback?.createdAt ?? new Date().toISOString(),
  };
};

// ============================================================================
// HELPERS: Role classification
// ============================================================================

export const isMatrizProfile = (userLike?: UserLike) => isMainUser(userLike);

export const isRhMatriz = (userLike?: UserLike) => isMainUser(userLike);

export const isAdministrativoMatriz = (userLike?: UserLike) => isMainUser(userLike);

export const isFinanceiroMatriz = (userLike?: UserLike) => isMainUser(userLike);

export const isRhObra = (userLike?: UserLike) => isWorkUser(userLike);

export const isClienteObra = (userLike?: UserLike) => {
  const role = typeof userLike === "string" ? userLike : userLike?.role;
  return !!role && role.startsWith("cliente_obra_");
};

export const isFinanceiro = (userLike?: UserLike) => isFinanceiroMatriz(userLike);

// ============================================================================
// PAGE ACCESS: Determine visibility
// ============================================================================

/** Pode acessar página Painel? Todos menos cliente de obra. */
export const canAccessPainel = (userLike?: UserLike) => !isClienteObra(userLike);

/** Pode acessar página Funcionários? Matriz e RH de obra podem (RH de obra apenas sua obra). */
export const canAccessFuncionarios = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode EDITAR funcionários? Matriz e RH de obra podem (RH de obra apenas sua obra). */
export const canEditFuncionarios = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode acessar página Obras? Todos. Para rh_obra aparece apenas a sua. */
export const canAccessObras = (_userLike?: UserLike) => true;

/** Pode acessar página Folha Salarial? RH_matriz, administrativo_matriz, financeiro_matriz e rh_obra. */
export const canAccessFolhaSalarial = (userLike?: UserLike) =>
  isMainUser(userLike) || isRhObra(userLike);

/** Pode EDITAR Folha Salarial? Não se for financeiro. RH de obra também pode. */
export const canEditFolhaSalarial = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode acessar página Horas Extras? Perfis de matriz e RH de obra podem. Financeiro não edita. */
export const canAccessHorasExtras = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode EDITAR Horas Extras? RH matriz e RH de obra podem; financeiro não. */
export const canEditHorasExtras = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode acessar página RDV? Matriz e RH de obra podem; administrativo e financeiro matriz também. */
export const canAccessRDV = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode EDITAR RDV? Matriz e RH de obra podem; financeiro não. */
export const canEditRDV = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode acessar página Documentos? Todos menos cliente de obra. Para rh_obra aparecem apenas os da sua obra. */
export const canAccessDocumentos = (_userLike?: UserLike) => true;

/** Pode EDITAR Documentos? RH pode, financeiro não. Cliente não. */
export const canEditDocumentos = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode acessar página Demissões? Apenas rh_matriz, administrativo_matriz e rh_obra. */
export const canAccessDemissoes = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode APROVAR demissão? Apenas rh_matriz. */
export const canApproveDemissoes = (userLike?: UserLike) => isMainUser(userLike);

/** Pode criar/editar demissão? RH pode. */
export const canEditDemissoes = (userLike?: UserLike) => isMainUser(userLike) || isRhObra(userLike);

/** Pode acessar uma obra específica? */
export const canAccessObra = (user: AppUser | null, obraId: string) => {
  if (!user) return false;
  if (isMainUser(user)) return true;
  if (isWorkUser(user)) return getUserWorkId(user) === obraId;
  if (isClienteObra(user.role)) return user.obraId === obraId;
  return false;
};

/** Pode ver todos os funcionários da obra ou apenas os da sua? */
export const shouldFilterObra = (userLike?: UserLike, obraId?: string) => {
  if (isMainUser(userLike)) return false;
  if (isWorkUser(userLike)) return true;
  if (isClienteObra(userLike)) return true;
  return false;
};

/** Pode ver salário? Cliente de obra não pode. */
export const canViewSalary = (userLike?: UserLike) => !isClienteObra(userLike);

/** Gera o cargo dinâmico para o RH de uma obra recém-criada. */
export const roleForRhObra = (obraId: string) => `rh_obra_${obraId}`;

/** Gera o cargo dinâmico para o Cliente de uma obra. */
export const roleForClienteObra = (obraId: string) => `cliente_obra_${obraId}`;

/** Extrai o obraId de um role rh_obra_<obraId> */
export const getObraIdFromRhObra = (role: string): string | null => {
  if (!role.startsWith("rh_obra_")) return null;
  return role.substring(8);
};

/** Extrai o obraId de um role cliente_obra_<obraId> */
export const getObraIdFromClienteObra = (role: string): string | null => {
  if (!role.startsWith("cliente_obra_")) return null;
  return role.substring(12);
};
