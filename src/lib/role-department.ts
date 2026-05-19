export type SimpleDepartment = "Operacional" | "Administrativo";

const ADMIN_KEYWORDS = [
  "admin", "rh", "recursos humanos", "financeir", "contab", "compras",
  "secretari", "assistente administrativ", "auxiliar administrativ",
  "analista", "gerente administrativ", "diretor", "comercial",
  "engenheir", "arquiteto", "planejament", "qualidade", "tecnologi",
  "ti ", "estagi", "tesourar", "fiscal", "controlador",
];

export function departmentFromRole(role: string): SimpleDepartment {
  const r = (role || "").toLowerCase();
  if (!r) return "Operacional";
  return ADMIN_KEYWORDS.some((k) => r.includes(k)) ? "Administrativo" : "Operacional";
}
