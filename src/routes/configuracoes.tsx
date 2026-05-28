import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useHorarios, horariosStore, type Horario } from "@/lib/horarios-store";
import { isClienteObra, isWorkUser, type UserType } from "@/lib/permissions";
import { useWorks } from "@/lib/works";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Bucagrans RH" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const auth = useAuth();
  const navigate = useNavigate();

  // No redirect: work-site users can access a reduced settings UI (horários + alterar senha)

  return (
    <PageShell
      eyebrow="Sistema"
      title="Configurações"
      description="Preferências da conta, da empresa, dos usuários e do RH."
    >
      {isWorkUser(auth.currentUser) ? (
        // Work-site users see only horarios and change-password
        <Tabs defaultValue="horarios" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="horarios">Horários</TabsTrigger>
            <TabsTrigger value="senha">Alterar senha</TabsTrigger>
          </TabsList>

          <TabsContent value="horarios" className="mt-4">
            <HorariosPanel />
          </TabsContent>

          <TabsContent value="senha" className="mt-4">
            <PasswordPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="empresa" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="empresa">Empresa</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="horarios">Horários</TabsTrigger>
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
            <HorariosPanel />
          </TabsContent>
        </Tabs>
      )}
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

  const handleDeleteConfirm = async () => {
    if (!removeId) return;
    try {
      await authStore.remove(removeId);
      toast.success("Usuário removido.");
      setRemoveId(null);
      await authStore.fetchAllUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover usuário.");
    }
  };

  return (
    <>
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
                      {u.type === "main" ? "Matriz" : (u.workName || u.workId || "Obra")}
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

      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remover
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function UserFormDialog({ editing, onDone }: { editing: AppUser | null; onDone: () => void }) {
  const auth = useAuth();
  const works = useWorks();
  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [seat, setSeat] = useState<string>(editing?.type === "work" ? (editing.workId ?? editing.obraId ?? "") : "main");
  const [accessKind, setAccessKind] = useState<"rh" | "cliente">(
    editing && isClienteObra(editing.role) ? "cliente" : "rh",
  );
  const [loading, setLoading] = useState(false);

  const isCurrentUser = editing && editing.uid === auth.currentUserId;

  useEffect(() => {
    setName(editing?.name ?? "");
    setEmail(editing?.email ?? "");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setResetSent(false);
    setSeat(editing?.type === "work" ? (editing.workId ?? editing.obraId ?? "") : "main");
    setAccessKind(editing && isClienteObra(editing.role) ? "cliente" : "rh");
  }, [editing]);

  const selectedWork = seat === "main" ? null : works.find((work) => work.id === seat) ?? null;
  const selectedType: UserType = seat === "main" ? "main" : "work";
  const showAccessKind = seat !== "main";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        type: selectedType,
        workId: selectedType === "work" ? (selectedWork?.id ?? seat) : null,
        workName: selectedType === "work" ? (selectedWork?.name ?? null) : null,
          accessKind: selectedType === "work" ? accessKind : "rh",
      };

      if (editing) {
        await authStore.update(editing.uid, payload);

        // Update password if current user and new password is provided
        if (isCurrentUser && newPassword) {
          if (newPassword !== confirmPassword) {
            toast.error("As senhas não correspondem.");
            setLoading(false);
            return;
          }
          if (newPassword.length < 8) {
            toast.error("A senha deve ter no mínimo 8 caracteres.");
            setLoading(false);
            return;
          }
          await authStore.updatePassword(editing.uid, newPassword);
          toast.success("Usuário atualizado e senha alterada.");
        } else {
          toast.success("Usuário atualizado.");
        }
      } else {
        await authStore.create({ name, email, password, ...payload });
        toast.success("Usuário criado.");
      }
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async () => {
    if (!editing?.email) {
      toast.error("E-mail do usuário não encontrado.");
      return;
    }
    setLoading(true);
    try {
      await authStore.sendPasswordReset(editing.email);
      setResetSent(true);
      toast.success("E-mail de redefinição enviado.");
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar redefinição de senha.");
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
        {isCurrentUser && (
          <>
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold mb-3">Alterar senha (opcional)</p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Deixe em branco para manter a senha atual"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </>
        )}
        {editing && !isCurrentUser && (
          <div className="rounded-md border border-dashed border-border p-4">
            <p className="text-sm font-semibold">Redefinir senha</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Para outro usuário, o Firebase precisa enviar um e-mail de redefinição de senha.
            </p>
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="secondary" onClick={handleSendReset} disabled={loading}>
                {resetSent ? "E-mail enviado" : "Enviar redefinição de senha"}
              </Button>
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="seat">Sede</Label>
          <Select value={seat} onValueChange={setSeat}>
            <SelectTrigger id="seat">
              <SelectValue placeholder="Selecione a sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">Matriz</SelectItem>
              {works.map((work) => (
                <SelectItem key={work.id} value={work.id}>{work.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showAccessKind && (
          <div>
            <Label htmlFor="accessKind">Perfil de acesso</Label>
            <Select value={accessKind} onValueChange={(value) => setAccessKind(value as "rh" | "cliente") }>
              <SelectTrigger id="accessKind">
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rh">RH da obra</SelectItem>
                <SelectItem value="cliente">Cliente da obra</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Cliente da obra acessa apenas a própria obra e entra sem senha na tela de login.
            </p>
          </div>
        )}
        {/* no admin password required — creation uses secondary auth to avoid replacing current session */}
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

function HorariosPanel() {
  const horarios = useHorarios();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Horario | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [nome, setNome] = useState("");

  const handleAdd = () => {
    if (!nome.trim()) {
      toast.error("Digite um horário.");
      return;
    }
    horariosStore.add(nome);
    toast.success("Horário adicionado.");
    setNome("");
    setOpen(false);
  };

  const handleEdit = () => {
    if (!editing || !nome.trim()) {
      toast.error("Digite um horário.");
      return;
    }
    horariosStore.update(editing.id, nome);
    toast.success("Horário atualizado.");
    setNome("");
    setEditing(null);
    setOpen(false);
  };

  const handleRemoveConfirm = () => {
    if (!removeId) return;
    horariosStore.remove(removeId);
    toast.success("Horário removido.");
    setRemoveId(null);
  };

  const openDialog = (h?: Horario) => {
    if (h) {
      setEditing(h);
      setNome(h.nome);
    } else {
      setEditing(null);
      setNome("");
    }
    setOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> Horários de trabalho
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Horários que podem ser selecionados ao criar ou editar um funcionário.
            </p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="mr-1 h-4 w-4" /> Novo horário
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_100px_100px] items-center gap-3 border-b border-border bg-muted/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Descrição</div>
            <div className="text-center">Editar</div>
            <div className="text-center">Remover</div>
          </div>
          <ul className="divide-y divide-border">
            {horarios.length === 0 ? (
              <li className="px-5 py-4 text-center text-sm text-muted-foreground">
                Nenhum horário cadastrado.
              </li>
            ) : (
              horarios.map((h) => (
                <li key={h.id} className="grid grid-cols-[1fr_100px_100px] items-center gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium text-sm">{h.nome}</p>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openDialog(h)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setRemoveId(h.id)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar horário" : "Novo horário"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize a descrição do horário." : "Crie um novo horário de trabalho."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="horario-nome">Descrição</Label>
              <Input
                id="horario-nome"
                placeholder="Ex: 44H 2ª–6ª 07:00–17:00"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={editing ? handleEdit : handleAdd}>
              {editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja remover este horário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemoveConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remover
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PasswordPanel() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!auth.currentUserId) {
      toast.error("Você precisa estar autenticado para alterar a senha.");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      await authStore.updatePassword(auth.currentUserId!, password);
      toast.success("Senha atualizada com sucesso.");
      setPassword(""); setConfirm("");
    } catch (err: any) {
      toast.error(err.message || "Falha ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Alterar senha</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <Label>Nova senha</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <Label>Confirmar nova senha</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleChange} disabled={loading}>{loading ? 'Atualizando...' : 'Alterar senha'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
