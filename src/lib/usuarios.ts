import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { legacyRoleForUser, resolveUserType, type Role, type UserType } from "./permissions";

function toCaps(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export interface NovoUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  type: UserType;
  workId?: string | null;
  workName?: string | null;
  role?: Role;
}

/**
 * Cria um usuário no Firebase Auth (e-mail/senha) e o documento
 * correspondente em /usuarios/{uid}. Chamar na tela de Configurações.
 */
export async function criarUsuario({
  nome,
  email,
  senha,
  type,
  workId = null,
  workName = null,
  role,
}: NovoUsuarioInput) {
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  const uid = cred.user.uid;
  const resolvedType = resolveUserType(type);
  const resolvedWorkId = resolvedType === "work" ? workId : null;
  const resolvedWorkName = resolvedType === "work" ? workName : null;
  await setDoc(doc(db, "usuarios", uid), {
    uid,
    nome: toCaps(nome),
    email,
    type: resolvedType,
    workId: resolvedWorkId,
    workName: toCaps(resolvedWorkName),
    role: role ?? legacyRoleForUser(resolvedType, resolvedWorkId),
    obraId: resolvedWorkId,
    obraNome: toCaps(resolvedWorkName),
    sector: null,
    headquarter: null,
  });
  return uid;
}
