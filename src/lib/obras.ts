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
import { roleForObra, type AppUser } from "./permissions";
import { isMatriz } from "./permissions";

export interface Obra {
  id: string;
  nome: string;
  // outros campos da obra...
}

/**
 * Cria uma obra e já registra o cargo dinâmico rh_<obraId> em /cargos.
 * Esse cargo poderá ser atribuído a usuários do RH dessa obra.
 */
export async function criarObra(nome: string) {
  const ref = await addDoc(collection(db, "obras"), { nome });
  const obraId = ref.id;
  const role = roleForObra(obraId);
  await setDoc(doc(db, "cargos", role), {
    role,
    obraId,
    descricao: `RH da obra ${nome}`,
  });
  return { id: obraId, role };
}

export async function listarObras(user: AppUser | null): Promise<Obra[]> {
  if (!user) return [];
  const snap = await getDocs(collection(db, "obras"));
  const todas = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  if (isMatriz(user.role)) return todas;
  // RH de obra só vê a própria
  return todas.filter((o) => o.id === user.obraId);
}

export async function atualizarObra(id: string, data: Partial<Obra>) {
  await updateDoc(doc(db, "obras", id), data);
}

export async function deletarObra(id: string) {
  await deleteDoc(doc(db, "obras", id));
}
