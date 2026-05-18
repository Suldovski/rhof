import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { authStore, useAuth, type AppUser } from "@/lib/auth-store";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · Bucagrans RH" }] }),
  component: UsersPage,
});

function UsersPage() {
  const auth = useAuth();
  const current = auth.users.find((u) => u.id === auth.currentUserId);
  const isAdmin = current?.role === "Admin";

  if (!isAdmin) {
    return (
      <PageShell eyebrow="Administração" title="Usuários" description="Gerenciamento de usuários do sistema">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Apenas administradores podem acessar esta página.{" "}
            <Link to="/configuracoes" className="underline">Voltar</Link>.
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Administração"
      title="Usuários"
      description="Gerencie quem tem acesso ao sistema."
      actions={<CreateUserDialog />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Todos os usuários</CardTitle>
          <CardDescription>Crie, edite e gerencie usuários do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={auth.users} currentId={auth.currentUserId} />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppUser["role"]>("Operacional");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      authStore.create({ name, email, password, role });
      toast.success("Usuário criado.");
      setOpen(false);
      setName(""); setEmail(""); setPassword(""); setRole("Operacional");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus className="mr-1 h-4 w-4" /> Novo usuário</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>Crie um acesso ao sistema.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nome</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Senha</Label><Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div>
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppUser["role"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="RH">RH</SelectItem>
                <SelectItem value="Operacional">Operacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Criar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsersTable({ users, currentId }: { users: AppUser[]; currentId: string | null }) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email} · {u.role}</p>
          </div>
          <Button
            size="icon" variant="ghost"
            disabled={u.id === currentId}
            onClick={() => { authStore.remove(u.id); toast.success("Usuário removido."); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
