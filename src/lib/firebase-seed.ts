/**
 * Firebase Seed Script
 * 
 * Cria usuários de teste no Firebase Auth + Firestore
 * 
 * Uso:
 * 1. Importe em um arquivo que é chamado na inicialização (ex: start.ts)
 * 2. Chame seedDatabase() uma vez
 * 3. Remova a chamada depois que os dados estiverem criados
 */

import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

export interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: string;
  obraId?: string | null;
}

const SEED_USERS: SeedUser[] = [
  // RH Matriz - Full Access
  {
    email: "carla.mendes@bucagrans.com.br",
    password: "senha123",
    name: "Carla Mendes",
    role: "rh_matriz",
    obraId: null,
  },
  
  // Administrativo Matriz - Full Access (can't edit salary)
  {
    email: "administrativo@bucagrans.com.br",
    password: "senha123",
    name: "Admin Administrativo",
    role: "administrativo_matriz",
    obraId: null,
  },
  
  // Financeiro Matriz - Read-only
  {
    email: "financeiro@bucagrans.com.br",
    password: "senha123",
    name: "Ana Financeira",
    role: "financeiro_matriz",
    obraId: null,
  },
  
  // RH de Obra Específica
  {
    email: "rh.obra1@bucagrans.com.br",
    password: "senha123",
    name: "RH Obra 1",
    role: "rh_obra_obra_1",
    obraId: "obra_1",
  },
  
  // Cliente de Obra - Email only, no password needed
  {
    email: "cliente.obra1@bucagrans.com.br",
    password: "cliente123", // Será ignorado para clientes
    name: "Cliente Obra 1",
    role: "cliente_obra_obra_1",
    obraId: "obra_1",
  },
];

/**
 * Verifica se um usuário já existe no Firebase
 */
async function userExists(email: string): Promise<boolean> {
  try {
    const usersRef = collection(db, "usuarios");
    const q = query(usersRef, where("email", "==", email));
    const result = await getDocs(q);
    return !result.empty;
  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    return false;
  }
}

/**
 * Cria um usuário e salva no Firestore
 */
async function createSeedUser(user: SeedUser): Promise<void> {
  try {
    // Verificar se já existe
    const exists = await userExists(user.email);
    if (exists) {
      console.log(`✓ ${user.email} já existe, pulando...`);
      return;
    }

    // Criar usuário no Firebase Auth
    console.log(`Criando ${user.email}...`);
    const result = await createUserWithEmailAndPassword(
      auth,
      user.email,
      user.password
    );

    // Salvar dados no Firestore
    await setDoc(doc(db, "usuarios", result.user.uid), {
      name: user.name,
      email: user.email,
      role: user.role,
      obraId: user.obraId || null,
      createdAt: new Date().toISOString(),
    });

    console.log(`✅ ${user.email} criado com sucesso!`);

    // Fazer logout
    await signOut(auth);
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      console.log(`⚠️ ${user.email} já está em uso`);
    } else {
      console.error(`❌ Erro ao criar ${user.email}:`, error.message);
    }
  }
}

/**
 * Executa o seed completo
 */
export async function seedDatabase(): Promise<void> {
  console.log("\n🌱 Iniciando seed do Firebase...\n");

  for (const user of SEED_USERS) {
    await createSeedUser(user);
  }

  console.log("\n✅ Seed concluído!\n");
  console.log("Usuários de teste criados:");
  console.log("════════════════════════════════════════════════════");
  SEED_USERS.forEach((user) => {
    console.log(`Email: ${user.email}`);
    console.log(`Senha: ${user.password}`);
    console.log(`Role: ${user.role}`);
    console.log("─────────────────────────────────────────────────");
  });
}

/**
 * Log de usuários para copiar
 */
export function logSeedUsers(): void {
  console.table(
    SEED_USERS.map((u) => ({
      "E-mail": u.email,
      "Senha": u.password,
      "Nome": u.name,
      "Role": u.role,
      "Obra": u.obraId || "–",
    }))
  );
}
