// Hierarquia de cargos / regras de acesso (LGPD)
// - admin, rh_matriz: tudo (todas as obras + folha salarial)
// - rh_<obraId> (ex: rh_obcas): só a própria obra, SEM folha salarial

export type Role = "admin" | "rh_matriz" | string; // string = rh_<obraId>

export interface AppUser {
  uid: string;
  nome: string;
  email: string;
  role: Role;
  obraId?: string | null;
}

export const isMatriz = (role?: Role) =>
  role === "admin" || role === "rh_matriz";

export const isRhObra = (role?: Role) =>
  !!role && role.startsWith("rh_") && role !== "rh_matriz";

/** Pode ver/editar folha salarial? Apenas admin e rh_matriz. */
export const canAccessFolhaSalarial = (role?: Role) => isMatriz(role);

/** Pode ver/editar todas as obras? */
export const canManageAllObras = (role?: Role) => isMatriz(role);

/** Pode ver/editar uma obra específica? */
export const canAccessObra = (user: AppUser | null, obraId: string) => {
  if (!user) return false;
  if (isMatriz(user.role)) return true;
  return user.obraId === obraId;
};

/** Gera o cargo dinâmico para o RH de uma obra recém-criada. */
export const roleForObra = (obraId: string) => `rh_${obraId}`;
