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
import { listarObras, type Obra } from "@/lib/obras";
import { isRhMatriz } from "@/lib/permissions";
import { useSites } from "@/lib/sites-store";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · Bucagrans RH" }] }),
  component: UsersPage,
});

function UsersPage() {
  const auth = useAuth();
  const current = auth.currentUser;
  const [obras, setObras] = useState<Obra[]>([]);

  useEffect(() => {
    if (isRhMatriz(current?.role)) {
      listarObras(current).then(setObras);
    }
  }, [current]);

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
      actions={<CreateUserDialog obras={obras} />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Todos os usuários</CardTitle>
          <CardDescription>Crie, edite e gerencie usuários do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable currentUserId={auth.currentUserId} />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function CreateUserDialog({ obras }: { obras: Obra[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("rh_matriz");
  const [obraId, setObraId] = useState<string>("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!name || !email || !password) {
        toast.error("Preencha todos os campos obrigatórios.");
        return;
      }

      // Determine final role string: role may already be a obra-scoped value
      let roleConfig = role;
      let finalObraId: string | undefined = undefined;
      if (role.startsWith('rh_obra_') || role.startsWith('cliente_obra_')) {
        roleConfig = role;
        finalObraId = role.split('_').slice(2).join('_');
      }

      await authStore.create({
        name,
        email,
        password,
        role: roleConfig,
        obraId: finalObraId,
      });
      toast.success("Usuário criado.");
      setOpen(false);
      setName(""); 
      setEmail(""); 
      setPassword(""); 
      setRole("rh_matriz");
      setObraId("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const sites = useSites();

  const roleOptions = [
    { value: 'rh_matriz', label: 'RH da Matriz' },
    { value: 'administrativo_matriz', label: 'Administrativo da Matriz' },
    { value: 'financeiro_matriz', label: 'Financeiro da Matriz' },
    // dynamic obra roles appended from sites / obras
  ];
  const siteList = (obras && obras.length > 0) ? obras.map((o) => ({ id: o.id, label: (o as any).nome || (o as any).name || o.id })) : (sites || []).map((s) => ({ id: s.id, label: s.name }));
  siteList.forEach((s) => {
    roleOptions.push({ value: `rh_obra_${s.id}`, label: `RH · ${s.label}` });
    roleOptions.push({ value: `cliente_obra_${s.id}`, label: `Cliente · ${s.label}` });
  });

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
            <Label>Perfil</Label>
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

function UsersTable({ currentUserId }: { currentUserId: string | null }) {
  const allUsers = useAllUsers();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (uid: string) => {
    try {
      await authStore.remove(uid);
      toast.success("Usuário removido.");
      setConfirmDeleteId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <ul className="divide-y divide-border rounded-md border border-border">
        {allUsers.map((u) => (
          <li key={u.uid} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email} · {u.role}</p>
            </div>
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
