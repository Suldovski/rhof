import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { HardHat, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { authStore, useAuth } from "@/lib/auth-store";
import { getClientRedirectUrl } from "@/lib/client-helpers";
import { initializeAppData } from "@/lib/app-bootstrap";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar · SIGA" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || "/",
  }),
  component: Login,
});

function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Executar seed na primeira vez
  useEffect(() => {
    initializeAppData().catch((err) => {
      console.error("Erro ao inicializar dados:", err);
    });
  }, []);

  useEffect(() => {
    if (auth.currentUser && !auth.loading) {
      if (auth.currentUser.role?.startsWith("cliente_obra_")) {
        navigate({ to: getClientRedirectUrl(auth.currentUser) });
        return;
      }

      navigate({ to: redirect || "/" });
    }
  }, [auth.currentUser, auth.loading, navigate, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const trimmedEmail = email.trim();
      let user = password
        ? await authStore.login(trimmedEmail, password)
        : null;

      if (!user) {
        user = await authStore.loginClient(trimmedEmail);
      }

      if (!user) {
        toast.error("E-mail ou senha incorretos.");
        setIsLoading(false);
        return;
      }

      if (user.role?.startsWith("cliente_obra_")) {
        toast.success(`Bem-vindo(a), ${user.name}.`);
        navigate({ to: getClientRedirectUrl(user) });
        setIsLoading(false);
        return;
      }

      toast.success(`Bem-vindo(a), ${user.name}.`);
      // Navigation happens via useEffect when auth.currentUser updates
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login. Tente novamente.");
      setIsLoading(false);
    }
  }

  if (auth.loading) {
    return (
      <div className="grid min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5">
            <HardHat className="h-10 w-10 text-[#123d77]" />
          </div>
          <div className="leading-none">
            <div className="font-black tracking-[0.18em] text-white">BUCAGRANS</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/70">
              Construtora de Obras LTDA
            </div>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
            SIGA
          </p>
          <h1 className="mt-3 font-display text-5xl leading-tight">
            Sistema Integrado de Gestão Administrativa
          </h1>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-primary-foreground/40">
          © {new Date().getFullYear()} SIGA
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8">
            <div className="mb-6 flex justify-center lg:hidden">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm ring-1 ring-black/5">
                <HardHat className="h-11 w-11" />
              </div>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Entrar
            </p>
            <h2 className="mt-2 font-display text-3xl">Acesse sua conta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Clientes de obra podem entrar com o e-mail cadastrado. Usuários internos usam as credenciais cadastradas em Configurações → Usuários.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="grid gap-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@bucagrans.com.br"
                  required
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                <LogIn className="mr-1 h-4 w-4" />
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
