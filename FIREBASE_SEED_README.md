# 🚀 Firebase Seed - Guia de Uso

## ✅ O que foi criado?

Criei um sistema de seed automático que:
1. **Executa na primeira vez** que você acessa a página de login
2. **Cria usuários de teste** no Firebase Auth + Firestore
3. **Marca como concluído** para não repetir a cada reload
4. **Mostra um log** com os usuários criados

## 📝 Usuários de Teste Criados

| Email | Senha | Role | Acesso |
|-------|-------|------|--------|
| `carla.mendes@bucagrans.com.br` | `senha123` | **rh_matriz** | ✅ Full Access |
| `administrativo@bucagrans.com.br` | `senha123` | **administrativo_matriz** | ✅ Full Access (sem editar salário) |
| `financeiro@bucagrans.com.br` | `senha123` | **financeiro_matriz** | 👁️ Read-only |
| `rh.obra1@bucagrans.com.br` | `senha123` | **rh_obra_obra_1** | 📍 Apenas Obra 1 |
| `cliente.obra1@bucagrans.com.br` | `cliente123` | **cliente_obra_obra_1** | 🔒 Cliente (Email only) |

## 🔧 Como usar

### 1️⃣ Primeira execução
```bash
npm run dev
# Vá para http://localhost:3000/login
# O seed rodará automaticamente no console
```

### 2️⃣ Checar se funcionou
- Abra o **Console do navegador** (F12 → Console)
- Procure por mensagens de ✅ ou ❌
- Você verá algo como:
```
🌱 Iniciando seed do Firebase...
✅ carla.mendes@bucagrans.com.br criado com sucesso!
...
✅ Seed concluído!
```

### 3️⃣ Fazer login
Use qualquer um dos usuários acima para testar diferentes roles

## 🔄 Resetar o seed (se necessário)

Se quiser executar o seed novamente (por exemplo, se falhar):

```javascript
// No console do navegador:
localStorage.removeItem('firebase_seed_done');
location.reload();
```

## 📁 Arquivos criados

- `src/lib/firebase-seed.ts` - Script que cria os usuários
- `src/lib/app-bootstrap.ts` - Controlador de inicialização
- `src/routes/login.tsx` - Atualizado para chamar o seed

## ⚠️ Notas importantes

- ✅ O seed **só roda uma vez** (localStorage marca como feito)
- ✅ Se um usuário já existe, ele é pulado automaticamente
- ✅ Todos os usuários estão com senha simples para teste
- ⚠️ **REMOVA ANTES DE PRODUÇÃO** - Edite `app-bootstrap.ts` e remova a inicialização em produção
- 🔒 Use senhas fortes em produção

## 🐛 Se der erro?

1. **"Error: Failed to fetch"** → Verifique se Firebase Config está correto em `src/lib/firebase.ts`
2. **"Email already in use"** → Usuários já existem, é normal
3. **"Permission denied"** → Verifique regras de Firestore no Firebase Console

Teste agora! 🧪 Use o email `carla.mendes@bucagrans.com.br` com senha `senha123`
