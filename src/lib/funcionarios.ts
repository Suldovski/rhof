import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { isMatriz, type AppUser } from "./permissions";

export type TipoContrato = "CLT" | "PJ";
export type StatusFuncionario =
  | "admissao"
  | "ativo"
  | "afastado"
  | "demitido";

export interface Funcionario {
  id: string;
  nome: string;
  tipo: TipoContrato;
  /** Para CLT: número de RE. Para PJ: SEMPRE a string "PJ" (sem número). */
  re: string;
  obraId: string;
  status: StatusFuncionario;
  // ...demais campos (cpf, cargo, salario, etc.)
  salario?: number;
}

export interface NovoFuncionarioInput {
  nome: string;
  tipo: TipoContrato;
  obraId: string;
  re?: string; // ignorado se tipo === "PJ"
  salario?: number;
}

/**
 * Cria um novo funcionário.
 * - Status inicial sempre "admissao" (editável depois).
 * - PJ nunca recebe número no RE, recebe a string "PJ".
 */
export async function criarFuncionario(input: NovoFuncionarioInput) {
  const re = input.tipo === "PJ" ? "PJ" : (input.re ?? "");
  const payload = {
    nome: input.nome,
    tipo: input.tipo,
    obraId: input.obraId,
    salario: input.salario ?? 0,
    re,
    status: "admissao" as StatusFuncionario,
  };
  const ref = await addDoc(collection(db, "funcionarios"), payload);
  return { id: ref.id, ...payload };
}

/** Lista funcionários respeitando a permissão do usuário. */
export async function listarFuncionarios(
  user: AppUser | null,
): Promise<Funcionario[]> {
  if (!user) return [];
  const col = collection(db, "funcionarios");
  const q = isMatriz(user.role)
    ? col
    : query(col, where("obraId", "==", user.obraId ?? "__none__"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/**
 * Lista funcionários para a tela de FOLHA SALARIAL.
 * - Apenas admin / rh_matriz devem acessar (verifique antes via canAccessFolhaSalarial).
 * - PJ não aparecem aqui — apenas CLT.
 */
export async function listarFuncionariosFolha(
  user: AppUser | null,
): Promise<Funcionario[]> {
  if (!user || !isMatriz(user.role)) return [];
  const snap = await getDocs(
    query(collection(db, "funcionarios"), where("tipo", "==", "CLT")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function atualizarFuncionario(
  id: string,
  data: Partial<Funcionario>,
) {
  // garante que PJ nunca grava número no RE
  if (data.tipo === "PJ") data.re = "PJ";
  await updateDoc(doc(db, "funcionarios", id), data);
}

export async function atualizarStatus(id: string, status: StatusFuncionario) {
  await updateDoc(doc(db, "funcionarios", id), { status });
}

export async function deletarFuncionario(id: string) {
  await deleteDoc(doc(db, "funcionarios", id));
}
