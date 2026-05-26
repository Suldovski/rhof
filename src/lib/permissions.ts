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

export interface AppUser {
  uid: string;
  nome: string;
  email: string;
  role: Role;
  obraId?: string | null;
  createdAt?: string;
}

// ============================================================================
// HELPERS: Role classification
// ============================================================================

export const isMatrizProfile = (role?: Role) =>
  role === "rh_matriz" || 
  role === "administrativo_matriz" || 
  role === "financeiro_matriz";

export const isRhMatriz = (role?: Role) => role === "rh_matriz";

export const isAdministrativoMatriz = (role?: Role) => role === "administrativo_matriz";

export const isFinanceiroMatriz = (role?: Role) => role === "financeiro_matriz";

export const isRhObra = (role?: Role) =>
  !!role && role.startsWith("rh_obra_");

export const isClienteObra = (role?: Role) =>
  !!role && role.startsWith("cliente_obra_");

export const isFinanceiro = (role?: Role) => isFinanceiroMatriz(role);

// ============================================================================
// PAGE ACCESS: Determine visibility
// ============================================================================

/** Pode acessar página Painel? Todos menos cliente de obra. */
export const canAccessPainel = (role?: Role) => 
  !isClienteObra(role);

/** Pode acessar página Funcionários? Apenas RH matriz, administrativo_matriz e financeiro_matriz. RH_obra NÃO acessa. */
export const canAccessFuncionarios = (role?: Role) => 
  isRhMatriz(role) || isAdministrativoMatriz(role) || isFinanceiroMatriz(role);

/** Pode EDITAR funcionários? Não se for financeiro. Apenas RH matriz e administrativo podem. RH obra NÃO edita. */
export const canEditFuncionarios = (role?: Role) => 
  isRhMatriz(role) || isAdministrativoMatriz(role);

/** Pode acessar página Obras? Todos. Para rh_obra aparece apenas a sua. */
export const canAccessObras = (role?: Role) => 
  !isClienteObra(role) || isClienteObra(role); // true para todos

/** Pode acessar página Folha Salarial? RH_matriz, administrativo_matriz, financeiro_matriz e rh_obra. */
export const canAccessFolhaSalarial = (role?: Role) =>
  isRhMatriz(role) || isAdministrativoMatriz(role) || isFinanceiroMatriz(role) || isRhObra(role);

/** Pode EDITAR Folha Salarial? Não se for financeiro. */
export const canEditFolhaSalarial = (role?: Role) =>
  isRhMatriz(role) || isAdministrativoMatriz(role);

/** Pode acessar página Horas Extras? Apenas perfis de matriz e rh_obra. Financeiro não edita. */
export const canAccessHorasExtras = (role?: Role) =>
  isMatrizProfile(role) || isRhObra(role);

/** Pode EDITAR Horas Extras? Não se for financeiro. */
export const canEditHorasExtras = (role?: Role) =>
  isRhMatriz(role) || isAdministrativoMatriz(role);

/** Pode acessar página RDV? Apenas rh_matriz, administrativo_matriz, financeiro_matriz e rh_obra. */
export const canAccessRDV = (role?: Role) =>
  isRhMatriz(role) || isAdministrativoMatriz(role) || isFinanceiroMatriz(role) || isRhObra(role);

/** Pode EDITAR RDV? Não se for financeiro. */
export const canEditRDV = (role?: Role) =>
  isRhMatriz(role) || isAdministrativoMatriz(role);

/** Pode acessar página Documentos? Todos menos cliente de obra. Para rh_obra aparecem apenas os da sua obra. */
export const canAccessDocumentos = (role?: Role) =>
  !isClienteObra(role) || isClienteObra(role); // true para todos

/** Pode EDITAR Documentos? RH pode, financeiro não. Cliente não. */
export const canEditDocumentos = (role?: Role) =>
  isRhMatriz(role) || isAdministrativoMatriz(role) || isRhObra(role);

/** Pode acessar página Demissões? Apenas rh_matriz, administrativo_matriz e rh_obra. */
export const canAccessDemissoes = (role?: Role) =>
  isRhMatriz(role) || isAdministrativoMatriz(role) || isRhObra(role);

/** Pode APROVAR demissão? Apenas rh_matriz. */
export const canApproveDemissoes = (role?: Role) =>
  isRhMatriz(role);

/** Pode criar/editar demissão? RH pode. */
export const canEditDemissoes = (role?: Role) =>
  isRhMatriz(role) || isAdministrativoMatriz(role) || isRhObra(role);

/** Pode acessar uma obra específica? */
export const canAccessObra = (user: AppUser | null, obraId: string) => {
  if (!user) return false;
  if (isMatrizProfile(user.role)) return true;
  if (isRhObra(user.role)) return user.obraId === obraId;
  if (isClienteObra(user.role)) return user.obraId === obraId;
  return false;
};

/** Pode ver todos os funcionários da obra ou apenas os da sua? */
export const shouldFilterObra = (role?: Role, obraId?: string) => {
  if (isMatrizProfile(role)) return false; // vê todos
  if (isRhObra(role)) return true; // filtra pela sua obra
  if (isClienteObra(role)) return true; // filtra pela sua obra
  return false;
};

/** Pode ver salário? Cliente de obra não pode. */
export const canViewSalary = (role?: Role) => 
  !isClienteObra(role);

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
