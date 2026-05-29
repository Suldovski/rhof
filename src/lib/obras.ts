import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { roleForRhObra, roleForClienteObra, isMatrizProfile, type AppUser } from "./permissions";

function toCaps(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export interface Obra {
  id: string;
  nome: string;
  // outros campos da obra...
}

/**
 * Cria uma obra e já registra o cargo dinâmico rh_<obraId> em /cargos.
 * Esse cargo poderá ser atribuído a usuários do RH dessa obra.
 */
/**
 * Cria uma obra no Firestore. Se um `id` for passado, usa esse id (útil para
 * manter sincronização com o `sitesStore` que já gera o slug localmente).
 */
export async function criarObra(nome: string, id?: string) {
  const nomeCaps = toCaps(nome);
  let obraId: string;
  if (id) {
    // grava com o id informado
    await setDoc(doc(db, "obras", id), { nome: nomeCaps });
    obraId = id;
  } else {
    const ref = await addDoc(collection(db, "obras"), { nome: nomeCaps });
    obraId = ref.id;
  }

  const rhRole = roleForRhObra(obraId);
  await setDoc(doc(db, "cargos", rhRole), {
    role: rhRole,
    obraId,
    descricao: `RH DA OBRA ${nomeCaps}`,
  });

  const clienteRole = roleForClienteObra(obraId);
  await setDoc(doc(db, "cargos", clienteRole), {
    role: clienteRole,
    obraId,
    descricao: `CLIENTE DA OBRA ${nomeCaps}`,
  });

  return { id: obraId, role: rhRole, clienteRole };
}

export async function listarObras(user: AppUser | null): Promise<Obra[]> {
  if (!user) return [];
  const snap = await getDocs(collection(db, "obras"));
  const todas = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
    nome: toCaps((d.data() as any).nome),
  }));
  if (isMatrizProfile(user.role)) return todas;
  // RH de obra só vê a própria
  return todas.filter((o) => o.id === user.obraId);
}

export async function atualizarObra(id: string, data: Partial<Obra>) {
  await updateDoc(doc(db, "obras", id), {
    ...data,
    nome: toCaps(data.nome),
  });
}

export async function deletarObra(id: string) {
  await deleteDoc(doc(db, "obras", id));
}
