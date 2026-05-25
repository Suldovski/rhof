import type { Employee } from "./employees";

/**
 * Verificar se um funcionário é PJ
 */
export const isPJEmployee = (employee: Employee | null | undefined): boolean => {
  return employee?.tipo === "pj";
};

/**
 * Verificar se um funcionário é CLT (efetivo ou terceiro)
 */
export const isCLTEmployee = (employee: Employee | null | undefined): boolean => {
  const tipo = employee?.tipo;
  return tipo === "efetivo" || tipo === "terceiro" || !tipo;
};

/**
 * Verificar se um funcionário deve aparecer na folha salarial
 * Apenas CLT aparecem, PJ não aparecem
 */
export const shouldAppearInPayroll = (employee: Employee | null | undefined): boolean => {
  return isCLTEmployee(employee);
};

/**
 * Obter o valor do RE (Registro de Empregado)
 * Para PJ, retorna "PJ" em vez do número de matrícula
 */
export const getREDisplay = (employee: Employee | null | undefined): string => {
  if (!employee) return "";
  if (isPJEmployee(employee)) return "PJ";
  return employee.id;
};

/**
 * Verificar se deve mostrar campo de RE na interface
 * PJ deve mostrar apenas "PJ" sem campo editável
 */
export const shouldShowREField = (employee: Employee | null | undefined): boolean => {
  return !isPJEmployee(employee);
};

/**
 * Formatar campo RE para display
 */
export const formatRE = (employee: Employee | null | undefined): string => {
  if (!employee) return "";
  if (isPJEmployee(employee)) return "PJ";
  return employee.id;
};
