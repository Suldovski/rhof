import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AlertCircle, UserPlus, Trash2, Pencil } from "lucide-react";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { authStore, useAuth, useAllUsers, type AppUser } from "@/lib/auth-store";
import { isRhMatriz } from "@/lib/permissions";
import { useSites } from "@/lib/sites-store";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · Bucagrans RH" }] }),
  component: UsersPage,
});

type RoleOpt = { value: string; label: string };

function useRoleOptions(): RoleOpt[] {
  const sites = useSites();
  const base: RoleOpt[] = [
    { value: "rh_matriz", label: "RH da Matriz" },
    { value: "administrativo_matriz", label: "Administrativo da Matriz" },
    { value: "financeiro_matriz", label: "Financeiro da Matriz" },
  ];
  sites.forEach((s) => {
    base.push({ value: `rh_obra_${s.id}`, label: `RH · ${s.name}` });
    base.push({ value: `cliente_obra_${s.id}`, label: `Cliente · ${s.name}` });
  });
  return base;
}

function UsersPage() {
  const auth = useAuth();
  const current = auth.currentUser;
  const isAdmin = isRhMatriz(current?.role);

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
          <UsersTable currentUserId={auth.currentUserId ?? null} />
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
  const [role, setRole] = useState<string>("rh_matriz");
  const roleOptions = useRoleOptions();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!name || !email || !password) {
        toast.error("Preencha todos os campos obrigatórios.");
        return;
      }
      let finalObraId: string | undefined;
      if (role.startsWith("rh_obra_")) finalObraId = role.substring(8);
      else if (role.startsWith("cliente_obra_")) finalObraId = role.substring(13);

      await authStore.create({
        name,
        email,
        password,
        role,
        obraId: finalObraId,
      });
      toast.success("Usuário criado.");
      setOpen(false);
      setName(""); setEmail(""); setPassword(""); setRole("rh_matriz");
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
          <div>
            <Label>Nome</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Senha</Label>
            <Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label>Tipo de usuário</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit">Criar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user, open, onOpenChange,
}: {
  user: AppUser;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<string>(user.role);
  const roleOptions = useRoleOptions();

  useEffect(() => {
    setName(user.name);
    setRole(user.role);
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalObraId: string | null = null;
      if (role.startsWith("rh_obra_")) finalObraId = role.substring(8);
      else if (role.startsWith("cliente_obra_")) finalObraId = role.substring(13);

      await authStore.update(user.uid, {
        name,
        role,
        obraId: finalObraId,
      } as any);
      toast.success("Usuário atualizado.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>Atualize o nome ou tipo de acesso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input disabled value={user.email} />
          </div>
          <div>
            <Label>Tipo de usuário</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsersTable({ currentUserId }: { currentUserId: string | null }) {
  const allUsers = useAllUsers();
  const roleOptions = useRoleOptions();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);

  const handleDelete = async (uid: string) => {
    try {
      await authStore.remove(uid);
      toast.success("Usuário removido.");
      setConfirmDeleteId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const roleLabel = (value: string) =>
    roleOptions.find((r) => r.value === value)?.label || value;

  return (
    <>
      <ul className="divide-y divide-border rounded-md border border-border">
        {allUsers.map((u) => (
          <li key={u.uid} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email} · {roleLabel(u.role)}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(u)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon" variant="ghost"
              disabled={u.uid === currentUserId}
              onClick={() => setConfirmDeleteId(u.uid)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      {editing && (
        <EditUserDialog
          user={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
        />
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
