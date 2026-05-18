import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { HardHat, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { authStore, useAuth } from "@/lib/auth-store";
import { setUserName } from "@/lib/user";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar · Bucagrans RH" }] }),
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

  useEffect(() => {
    if (auth.currentUserId) navigate({ to: redirect || "/" });
  }, [auth.currentUserId, navigate, redirect]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const user = authStore.login(email.trim(), password);
    if (!user) {
      toast.error("E-mail ou senha incorretos.");
      return;
    }
    setUserName(user.name);
    toast.success(`Bem-vindo(a), ${user.name}.`);
    navigate({ to: redirect || "/" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg leading-tight">BUCAGRANS</p>
            <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60">
              Recursos Humanos
            </p>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
            Plataforma RH
          </p>
          <h1 className="mt-3 font-display text-5xl leading-tight">
            Gestão de pessoas para empresas de obras.
          </h1>
          <p className="mt-4 max-w-md text-sm text-primary-foreground/70">
            Cadastros, ponto, folha e documentos de canteiro em um só lugar.
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-primary-foreground/40">
          © {new Date().getFullYear()} Bucagrans Construtora
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <HardHat className="h-5 w-5" />
              </div>
              <p className="font-display text-lg">BUCAGRANS</p>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Entrar
            </p>
            <h2 className="mt-2 font-display text-3xl">Acesse sua conta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use as credenciais cadastradas em Configurações → Usuários.
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
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                <LogIn className="mr-1 h-4 w-4" /> Entrar
              </Button>
            </form>

            <div className="mt-6 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Conta padrão de demonstração</p>
              <p className="mt-0.5">admin@bucagrans.com.br · admin123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
