import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Bell, Shield, Palette, Save, UserCog, Plus, Trash2, Mail, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { authStore, useAuth, type AppUser } from "@/lib/auth-store";
import { horariosStore, useHorarios } from "@/lib/horarios-store";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Bucagrans RH" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const [company, setCompany] = useState({
    name: "Bucagrans Construtora Ltda.",
    cnpj: "12.345.678/0001-90",
    email: "rh@bucagrans.com.br",
    phone: "(11) 4002-8922",
    address: "Av. Paulista, 1500 — Bela Vista, São Paulo/SP",
  });

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
      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa"><Building2 className="mr-1.5 h-3.5 w-3.5" /> Empresa</TabsTrigger>
          <TabsTrigger value="usuarios"><UserCog className="mr-1.5 h-3.5 w-3.5" /> Usuários</TabsTrigger>
          <TabsTrigger value="horarios"><Clock className="mr-1.5 h-3.5 w-3.5" /> Horários</TabsTrigger>
          <TabsTrigger value="notificacoes"><Bell className="mr-1.5 h-3.5 w-3.5" /> Notificações</TabsTrigger>
          <TabsTrigger value="seguranca"><Shield className="mr-1.5 h-3.5 w-3.5" /> Segurança</TabsTrigger>
          <TabsTrigger value="aparencia"><Palette className="mr-1.5 h-3.5 w-3.5" /> Aparência</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Dados da empresa</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Razão social">
                <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
              </Field>
              <Field label="CNPJ">
                <Input value={company.cnpj} onChange={(e) => setCompany({ ...company, cnpj: e.target.value })} />
              </Field>
              <Field label="E-mail do RH">
                <Input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
              </Field>
              <Field label="Telefone">
                <Input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
              </Field>
              <Field label="Endereço" className="md:col-span-2">
                <Input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
              </Field>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={() => toast.success("Dados da empresa salvos.")}>
                  <Save className="mr-1 h-4 w-4" /> Salvar alterações
                </Button>
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

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
          {auth.users.map((u) => (
            <li key={u.id} className="grid grid-cols-[1.5fr_1fr_120px_120px_80px] items-center gap-3 px-5 py-4">
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
                {u.id === auth.currentUserId ? (
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
                  size="icon" variant="ghost"
                  disabled={u.id === auth.currentUserId}
                  onClick={() => setRemoveId(u.id)} aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário perderá acesso ao sistema. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (removeId) {
                authStore.remove(removeId);
                toast.success("Usuário removido.");
              }
              setRemoveId(null);
            }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function HorariosPanel() {
  const horarios = useHorarios();
  const [novo, setNovo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Horários / escalas</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Cadastre os horários disponíveis para seleção no cadastro de funcionários.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!novo.trim()) return;
            horariosStore.add(novo);
            setNovo("");
            toast.success("Horário adicionado.");
          }}
        >
          <Input
            placeholder="EX: 44H 2ª–6ª 07:00–17:00"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
          />
          <Button type="submit">
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </form>
        <ul className="divide-y divide-border rounded-md border border-border">
          {horarios.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum horário cadastrado.
            </li>
          )}
          {horarios.map((h) => (
            <li key={h.id} className="flex items-center gap-2 px-4 py-3">
              {editingId === h.id ? (
                <>
                  <Input
                    value={editingNome}
                    onChange={(e) => setEditingNome(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      horariosStore.update(h.id, editingNome);
                      setEditingId(null);
                      toast.success("Horário atualizado.");
                    }}
                  >
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{h.nome}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(h.id);
                      setEditingNome(h.nome);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      horariosStore.remove(h.id);
                      toast.success("Horário removido.");
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function UserFormDialog({ editing, onDone }: { editing: AppUser | null; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppUser["role"]>(editing?.role ?? "RH");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display">{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        <DialogDescription>
          As credenciais serão usadas para login na plataforma.
        </DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!editing && password.length < 6) {
            toast.error("Senha deve ter ao menos 6 caracteres.");
            return;
          }
          try {
            if (editing) {
              const patch: Partial<AppUser> = { name: name.trim(), email: email.trim(), role };
              if (password) patch.password = password;
              authStore.update(editing.id, patch);
              toast.success("Usuário atualizado.");
            } else {
              authStore.create({ name: name.trim(), email: email.trim(), password, role });
              toast.success("Usuário criado.");
            }
            onDone();
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      >
        <div className="grid gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome completo *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {editing ? "Nova senha (opcional)" : "Senha *"}
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!editing}
              minLength={editing ? undefined : 6}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppUser["role"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="RH">RH</SelectItem>
                <SelectItem value="Operacional">Operacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
          <Button type="submit">{editing ? "Salvar alterações" : "Criar usuário"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NotifRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
