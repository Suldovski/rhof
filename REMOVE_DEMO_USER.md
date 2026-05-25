# 🔑 Demo User para GitHub Pages

## ✅ Usuário de Demonstração

Para acessar via GitHub Pages sem Firebase configurado, um usuário demo foi adicionado:

```
Email:  demo@bucagrans.com.br
Senha:  demo123
Acesso: Completo (rh_matriz - todas as páginas)
```

## 📍 Onde está no código?

- **Arquivo**: `src/lib/auth-store.ts`
- **Lines**: ~18-30 (DEMO_USER constant)

## 🧹 Como remover (IMPORTANTE!)

### Passo 1: Excluir as linhas do demo user

Em `src/lib/auth-store.ts`, remova:

```typescript
// DEMO USER para GitHub Pages
const DEMO_USER: AppUser = {
  uid: "demo-user-001",
  name: "Demonstração",
  email: "demo@bucagrans.com.br",
  role: "rh_matriz",
  obraId: null,
  createdAt: new Date().toISOString(),
};

const DEMO_PASSWORD = "demo123";
const AUTH_STORAGE_KEY = "bucagrans_auth_demo";
```

### Passo 2: Remover validação de demo user no login

Em `src/lib/auth-store.ts`, no método `login:`, remova:

```typescript
// Check demo user first (GitHub Pages)
if (email.toLowerCase() === DEMO_USER.email.toLowerCase() && password === DEMO_PASSWORD) {
  console.log("✅ Demo user login (localStorage)");
  commit({ currentUser: DEMO_USER, loading: false, isLocalStorage: true });
  return DEMO_USER;
}
```

### Passo 3: Remover fallback de localStorage

Em `src/lib/auth-store.ts`, no Firebase listener, remova:

```typescript
// Tentar localStorage primeiro (GitHub Pages demo)
try {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    const user = JSON.parse(stored) as AppUser;
    commit({ currentUser: user, loading: false, isLocalStorage: true });
  }
} catch (err) {
  console.warn("Erro ao carregar usuário do localStorage:", err);
}
```

### Passo 4: Atualizar tipos

Em `src/lib/auth-store.ts`, no `AuthState`, remova `isLocalStorage`:

```typescript
// Remova esta linha do AuthState
isLocalStorage: boolean; // Demo user (GitHub Pages)
```

E remova do `initialState`:
```typescript
// Remova
isLocalStorage: false,
```

### Passo 5: Atualizar login.tsx

Em `src/routes/login.tsx`, remova o box de demo user:

```typescript
// Remova este bloco
{/* Demo User Info */}
<div className="mt-4 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
  <p className="font-semibold">Demo (GitHub Pages):</p>
  <p>Email: <code className="font-mono">demo@bucagrans.com.br</code></p>
  <p>Senha: <code className="font-mono">demo123</code></p>
  <p className="mt-1 text-[10px] opacity-75">Remova após criar seus usuários</p>
</div>
```

### Passo 6: Limpar useAuth

Em `src/lib/auth-store.ts`, no hook `useAuth()`, remova:

```typescript
const isLocalStorage = useSyncExternalStore(
  subscribe,
  () => state.isLocalStorage,
  () => false
);

// E remova do return:
isLocalStorage,
```

## ✅ Checklist final

- [ ] Removeu constante `DEMO_USER`
- [ ] Removeu validação de demo user no login
- [ ] Removeu fallback localStorage
- [ ] Removeu `isLocalStorage` de `AuthState`
- [ ] Removeu `isLocalStorage` do `initialState`
- [ ] Removeu box de demo do login.tsx
- [ ] Removeu `isLocalStorage` do hook `useAuth()`
- [ ] Testou login com Firebase (deve funcionar normalmente)

## 🔒 Segurança

Certifique-se de:
- ✅ Nunca fazer commit com demo user em produção
- ✅ Usar Firebase Auth para todos os usuários reais
- ✅ Implementar regras de Firestore adequadas
- ✅ Usar variáveis de ambiente para configuração sensível

---

**Última verificação**: Código limpo e sem demo user hardcoded? ✅ Pronto para deploy!
