/**
 * Bootstrap para desenvolvimento
 * Executa seed do Firebase na primeira vez
 */

import { seedDatabase } from "./firebase-seed";

const SEED_DONE_KEY = "firebase_seed_done";

/**
 * Executa seed apenas uma vez em desenvolvimento
 */
export async function initializeAppData(): Promise<void> {
  // Apenas em desenvolvimento
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  // Verificar se já foi feito
  const isDone = localStorage.getItem(SEED_DONE_KEY);
  if (isDone) {
    console.log("✓ Firebase seed já foi executado");
    return;
  }

  try {
    console.log("🚀 Executando inicialização do Firebase...");
    await seedDatabase();
    
    // Marcar como concluído
    localStorage.setItem(SEED_DONE_KEY, "true");
    console.log("✅ Inicialização completa!");
  } catch (error) {
    console.error("❌ Erro na inicialização:", error);
  }
}

/**
 * Limpar dados de seed (para reexecutar)
 */
export function resetSeedFlag(): void {
  localStorage.removeItem(SEED_DONE_KEY);
  console.log("🔄 Flag de seed removida. Próximo reload executará o seed novamente.");
}
