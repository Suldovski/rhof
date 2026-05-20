import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Role } from "./permissions";

export interface NovoUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  role: Role;
  obraId?: string | null;
}

/**
 * Cria um usuário no Firebase Auth (e-mail/senha) e o documento
 * correspondente em /usuarios/{uid}. Chamar na tela de Configurações.
 */
export async function criarUsuario({
  nome,
  email,
  senha,
  role,
  obraId = null,
}: NovoUsuarioInput) {
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  const uid = cred.user.uid;
  await setDoc(doc(db, "usuarios", uid), {
    uid,
    nome,
    email,
    role,
    obraId,
  });
  return uid;
}
