import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth, authStore, type AppUser, useAllUsers } from "@/lib/auth-store";
import type { Role } from "@/lib/permissions";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Bucagrans RH" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const auth = useAuth();
  const [notif, setNotif] = useState({
    admissions: true,
    vacations: true,
    docExpiry: true,
    weeklyDigest: false,
  });

  return (
    <PageShell
      eyebrow="Sistema"
      title="Configurações"
      description="Preferências da conta, da empresa, dos usuários e do RH."
    >
      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Dados da empresa</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Razão social</Label>
                <Input value="Bucagrans Construções LTDA" readOnly className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">CNPJ</Label>
                <Input value="00.000.000/0000-00" readOnly className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Endereço</Label>
                <Input value="Av. Paulista, 1500 — São Paulo, SP" readOnly className="mt-1" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <UsersPanel />
        </TabsContent>

        <TabsContent value="horarios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Horários padrão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entrada</Label>
                <Input type="time" value="08:00" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Saída</Label>
                <Input type="time" value="17:00" className="mt-1" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Alertas do RH</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <NotifRow label="Novas admissões" desc="Avisar quando um funcionário for cadastrado." checked={notif.admissions} onChange={(v) => setNotif({ ...notif, admissions: v })} />
              <Separator />
              <NotifRow label="Início de férias" desc="Lembretes 7 dias antes do início das férias." checked={notif.vacations} onChange={(v) => setNotif({ ...notif, vacations: v })} />
              <Separator />
              <NotifRow label="Documentos vencendo" desc="ASOs, exames periódicos e certificados próximos do vencimento." checked={notif.docExpiry} onChange={(v) => setNotif({ ...notif, docExpiry: v })} />
              <Separator />
              <NotifRow label="Resumo semanal" desc="Receber por e-mail um resumo das atividades de RH." checked={notif.weeklyDigest} onChange={(v) => setNotif({ ...notif, weeklyDigest: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Segurança da conta</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Senha atual"><Input type="password" placeholder="••••••••" /></Field>
              <div />
              <Field label="Nova senha"><Input type="password" placeholder="Mínimo 8 caracteres" /></Field>
              <Field label="Confirmar nova senha"><Input type="password" /></Field>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={() => toast.success("Senha atualizada.")}>Atualizar senha</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aparencia" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Tema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <NotifRow label="Modo compacto" desc="Reduz o espaçamento das listagens e tabelas." checked={false} onChange={() => toast.message("Em breve.")} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function UsersPanel() {
  const auth = useAuth();
  const allUsers = useAllUsers();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Carregar usuários ao montar o componente
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        await authStore.fetchAllUsers();
      } catch (err) {
        console.error("Erro ao carregar usuários:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const users = allUsers.length > 0 ? allUsers : (auth.currentUser ? [auth.currentUser] : []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="font-display text-lg">Usuários do sistema</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Usuários cadastrados aqui podem acessar a tela de login.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-1 h-4 w-4" /> Novo usuário
            </Button>
          </DialogTrigger>
          <UserFormDialog editing={editing} onDone={() => { setOpen(false); setEditing(null); }} />
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-[1.5fr_1fr_120px_120px_80px] items-center gap-3 border-b border-border bg-muted/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Nome / E-mail</div>
          <div>Criado em</div>
          <div>Perfil</div>
          <div>Status</div>
          <div />
        </div>
        <ul className="divide-y divide-border">
          {loading ? (
            <li className="px-5 py-4 text-center text-sm text-muted-foreground">
              Carregando usuários...
            </li>
          ) : users.length === 0 ? (
            <li className="px-5 py-4 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado.
            </li>
          ) : (
            users.map((u) => (
              <li key={u.uid} className="grid grid-cols-[1.5fr_1fr_120px_120px_80px] items-center gap-3 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {u.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{u.name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {u.email}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </div>
                <div>
                  <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
                    {u.role}
                  </Badge>
                </div>
                <div>
                  {u.uid === auth.currentUserId ? (
                    <Badge variant="secondary">Você</Badge>
                  ) : (
                    <Badge variant="outline">Ativo</Badge>
                  )}
                </div>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setOpen(true); }} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setRemoveId(u.uid)}
                    disabled={u.uid === auth.currentUserId}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function UserFormDialog({ editing, onDone }: { editing: AppUser | null; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(editing?.role ?? "rh_matriz");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await authStore.update(editing.uid, { name, email, role });
        toast.success("Usuário atualizado.");
      } else {
        await authStore.create({ name, email, password, role });
        toast.success("Usuário criado.");
      }
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar usuário.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        <DialogDescription>
          {editing ? "Atualize os dados do usuário." : "Crie um novo acesso ao sistema."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {!editing && (
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <Label htmlFor="role">Perfil</Label>
          <Select value={role} onValueChange={(value) => setRole(value as Role)}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rh_matriz">RH Matriz</SelectItem>
              <SelectItem value="administrativo_matriz">Administrativo Matriz</SelectItem>
              <SelectItem value="rh_obra">RH Obra</SelectItem>
              <SelectItem value="operacional">Operacional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : editing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function NotifRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
