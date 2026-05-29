import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, HardHat,
  ShieldCheck, Pencil, FileText, Download, Trash2, Plane, Save, Plus, Upload,
  Repeat, UserMinus, Camera,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { employeesStore, useEmployee, type Employee, type EmployeeStatus, type Dependente, type DocAnexo } from "@/lib/employees";
import { useSites } from "@/lib/sites-store";
import { useHorarios, horariosStore } from "@/lib/horarios-store";
import { UFS, SINDICATOS_POR_UF } from "@/lib/sindicatos";
import { readFileAsDataURL } from "@/lib/doc-templates-store";
import { fetchCep } from "@/lib/cep";
import { downloadFRE } from "@/lib/fre-pdf";
import { dismissalsStore } from "@/lib/dismissals-store";
import { authStore, useAuth } from "@/lib/auth-store";
import { isWorkUser, getUserWorkName, isRhMatriz, isClienteObra } from "@/lib/permissions";
import { useRouteProtection, roleChecks } from "@/lib/route-protection";

export const Route = createFileRoute("/funcionarios/$id")({
  head: ({ params }) => ({ meta: [{ title: `Funcionário #${params.id} · Bucagrans RH` }] }),
  notFoundComponent: () => (
    <div className="p-12 text-center">
      <p className="text-sm text-muted-foreground">Funcionário não encontrado.</p>
      <Button asChild className="mt-4"><Link to="/funcionarios">Voltar</Link></Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-sm text-destructive">{error.message}</div>
  ),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const e = useEmployee(id);
  const navigate = useNavigate();
  const auth = useAuth();
  const isClient = isClienteObra(auth.currentUser?.role);
  const [confirmDel, setConfirmDel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [trocaOpen, setTrocaOpen] = useState(false);
  const [demOpen, setDemOpen] = useState(false);

  useRouteProtection((user) => {
    if (isClienteObra(user)) {
      if (!e) return true;
      const myWorkName = getUserWorkName(user);
      const empSite = e.site || e.organograma || "";
      return !!myWorkName && !!empSite && empSite === myWorkName;
    }

    return roleChecks.funcionarios(user);
  }, "Funcionários");

  if (!e) {
    return (
      <PageShell title="Funcionário não encontrado" eyebrow="Quadro">
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Este funcionário não existe ou foi removido.
          <div className="mt-4"><Button asChild><Link to="/funcionarios">Voltar</Link></Button></div>
        </CardContent></Card>
      </PageShell>
    );
  }
  // If the user is a work-site user, ensure the employee belongs to their work
  const current = auth.currentUser;
  if (isWorkUser(current) && !isRhMatriz(current?.role)) {
    const myWorkName = getUserWorkName(current as any);
    const empSite = e.site || e.organograma || "";
    if (myWorkName && empSite && empSite !== myWorkName) {
      return (
        <PageShell eyebrow="Quadro" title="Acesso negado">
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Você não tem permissão para acessar este funcionário.
            </CardContent>
          </Card>
        </PageShell>
      );
    }
  }
  const initials = e.name.split(" ").slice(0, 2).map((n) => n[0]).join("");

  // 🔥 CORREÇÃO: Função assíncrona
  const setStatus = async (s: EmployeeStatus) => {
    await employeesStore.update(e.id, { status: s });
    toast.success(`Status alterado para ${s}.`);
  };

  return (
    <PageShell
      eyebrow={`Matrícula #${e.id}`}
      title={e.name}
      description={`${e.role} · ${e.site}`}
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/funcionarios"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
          {!isClient && (
            <>
              <Button variant="outline" onClick={() => { downloadFRE(e); toast.success("FRE exportada."); }}>
                <Download className="mr-1 h-4 w-4" /> Exportar FRE
              </Button>
              {e.status !== "ferias" ? (
                <Button variant="outline" onClick={() => setStatus("ferias")}>
                  <Plane className="mr-1 h-4 w-4" /> Colocar em férias
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setStatus("efetivo")}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Voltar de férias
                </Button>
              )}
              <Button variant="outline" onClick={() => setTrocaOpen(true)}>
                <Repeat className="mr-1 h-4 w-4" /> Trocar função
              </Button>
              <Button variant="outline" onClick={() => setDemOpen(true)} className="text-destructive">
                <UserMinus className="mr-1 h-4 w-4" /> Solicitar demissão
              </Button>
              <Button onClick={() => setEditing(true)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
              <Button variant="destructive" onClick={() => setConfirmDel(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> Apagar
              </Button>
            </>
          )}
        </>
      }
    >
      {!isClient && (
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Mover para</span>
            <Select value={e.status as string} onValueChange={(v) => setStatus(v as EmployeeStatus)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admissao">Em admissão</SelectItem>
                <SelectItem value="mobilizacao">Mobilização</SelectItem>
                <SelectItem value="efetivo">Efetivo</SelectItem>
                <SelectItem value="ferias">Em férias</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
                <SelectItem value="desligado">Desligado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="p-6 text-center">
            {e.photo ? (
              <img src={e.photo} alt={e.name} className="mx-auto h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {initials}
              </div>
            )}
            <h2 className="mt-4 font-display text-xl">{e.name}</h2>
            <p className="text-sm text-muted-foreground">{e.role}</p>
            {e.tipo === "terceiro" && e.empresaTerceiro && (
              <Badge variant="outline" className="mt-2 border-accent/40 text-accent">Terceiro · {e.empresaTerceiro}</Badge>
            )}
            {e.tipo === "pj" && e.empresaTerceiro && (
              <Badge variant="outline" className="mt-2 border-accent/40 text-accent">PJ · {e.empresaTerceiro}</Badge>
            )}
            <div className="mt-3 flex justify-center"><StatusBadge status={e.status} /></div>
            <div className="mt-6 space-y-3 text-left text-sm">
              <Row icon={Mail} label={e.email} />
              <Row icon={Phone} label={e.phone} />
              <Row icon={MapPin} label={e.address} />
              <Row icon={Calendar} label={`Admitido em ${e.admission ? new Date(e.admission).toLocaleDateString("pt-BR") : "—"}`} />
              <Row icon={HardHat} label={e.site} />
            </div>
          </CardContent>
        </Card>

        <div>
            <Tabs defaultValue="dados">
            <TabsList>
              <TabsTrigger value="dados">Dados pessoais</TabsTrigger>
              <TabsTrigger value="contrato">Contrato</TabsTrigger>
              <TabsTrigger value="docs">Documentos</TabsTrigger>
            </TabsList>
            <TabsContent value="dados" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="font-display text-lg">Identificação</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Info label="CPF" value={e.cpf} />
                  <Info label="RG" value={e.rg} />
                  <Info label="CTPS" value={e.ctps} />
                  <Info label="PIS" value={e.pis} />
                  <Info label="Nascimento" value={e.nascimento ? new Date(e.nascimento).toLocaleDateString("pt-BR") : "—"} />
                  <Info label="Estado civil" value={e.estadoCivil} />
                  <Info label="Sindicato" value={e.sindicato} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="contrato" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="font-display text-lg">Vínculo & remuneração</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Info label="Cargo" value={e.role} icon={Briefcase} />
                  <Info label="Departamento" value={e.departamento || e.department} />
                  <Info label="Obra alocada" value={e.site} />
                  <Info label="Admissão" value={e.admission ? new Date(e.admission).toLocaleDateString("pt-BR") : "—"} />
                  {!isClient ? (
                    <>
                      <Info label="Salário base" value={e.salary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                      <Info label="Salário/hora" value={(e.salarioHora || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    </>
                  ) : (
                    <Info label="Remuneração" value="Informação restrita ao RH" />
                  )}
                  <Info label="Escala/Horário" value={e.escalaHorario} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="docs" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="font-display text-lg">Documentos anexados</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(!e.documentos || e.documentos.length === 0) ? (
                    <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
                  ) : e.documentos.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                      <FileText className="h-4 w-4 text-accent" />
                      <span className="flex-1 text-sm">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{(d.size / 1024).toFixed(0)} KB</span>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={d.data} download={d.name} target="_blank" rel="noopener noreferrer">Abrir</a>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {!isClient && editing && (
        <EditEmployeeDialog open={editing} onOpenChange={setEditing} employee={e} />
      )}

      {!isClient && (
        <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar {e.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o funcionário. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {/* 🔥 CORREÇÃO: onClick assíncrono */}
            <AlertDialogAction onClick={async () => {
              await employeesStore.remove(e.id);
              toast.success("Funcionário apagado.");
              navigate({ to: "/funcionarios" });
            }}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      )}

      {!isClient && <TrocaFuncaoDialog open={trocaOpen} onOpenChange={setTrocaOpen} employee={e} />}
      {!isClient && <DemissaoDialog open={demOpen} onOpenChange={setDemOpen} employee={e} />}
    </PageShell>
  );
}

function TrocaFuncaoDialog({ open, onOpenChange, employee }: {
  open: boolean; onOpenChange: (o: boolean) => void; employee: Employee;
}) {
  const [novaFuncao, setNovaFuncao] = useState("");
  
  // 🔥 CORREÇÃO: Função assíncrona
  const confirmar = async () => {
    if (!novaFuncao.trim()) { toast.error("Informe a nova função."); return; }
    const history = [...(employee.roleHistory ?? []), {
      from: employee.cargoFuncao || employee.role,
      to: novaFuncao.trim(),
      date: new Date().toISOString(),
    }];
    await employeesStore.update(employee.id, {
      cargoFuncao: novaFuncao.trim(),
      role: novaFuncao.trim(),
      roleHistory: history,
    });
    toast.success(`Função alterada para ${novaFuncao.trim()}.`);
    onOpenChange(false);
    setNovaFuncao("");
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Trocar função</DialogTitle>
          <DialogDescription>
            Função atual: <strong>{employee.cargoFuncao || employee.role}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nova função</Label>
          <Input value={novaFuncao} onChange={(ev) => setNovaFuncao(ev.target.value)} placeholder="Ex: Mestre de Obras" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar}><Repeat className="mr-1 h-4 w-4" /> Concluir troca</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DemissaoDialog({ open, onOpenChange, employee }: {
  open: boolean; onOpenChange: (o: boolean) => void; employee: Employee;
}) {
  const [reason, setReason] = useState("");
  const confirmar = () => {
    if (!reason.trim()) { toast.error("Informe o motivo."); return; }
    const me = authStore.current();
    dismissalsStore.add({
      employeeId: employee.id,
      employeeName: employee.name,
      site: employee.site || employee.organograma,
      reason: reason.trim(),
      requestedBy: me?.name ?? "RH Obra",
    });
    toast.success("Solicitação enviada ao RH Matriz.");
    onOpenChange(false);
    setReason("");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Solicitar demissão</DialogTitle>
          <DialogDescription>
            O RH Matriz será notificado para aprovar e processar o desligamento de <strong>{employee.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Motivo</Label>
          <Textarea value={reason} onChange={(ev) => setReason(ev.target.value)} rows={4} placeholder="Descreva o motivo da solicitação..." autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar}><UserMinus className="mr-1 h-4 w-4" /> Enviar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-sm text-foreground">{label || "—"}</span>
    </div>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm font-medium">
        {Icon && <Icon className="h-4 w-4 text-accent" />}
        {value || "—"}
      </p>
    </div>
  );
}

function Field({ label, required, children, className = "" }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function EditEmployeeDialog({
  open, onOpenChange, employee,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Employee;
}) {
  const sites = useSites();
  const horarios = useHorarios();
  const [form, setForm] = useState<Employee>(employee);

  const set = <K extends keyof Employee>(k: K, v: Employee[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const sindUF = form.sindicatoUf ? SINDICATOS_POR_UF[form.sindicatoUf] ?? [] : [];

  const addDep = () => set("dependentes", [
    ...form.dependentes,
    { id: `d-${Date.now()}`, nome: "", cpf: "", nascimento: "", cidade: "", uf: "", parentesco: "" },
  ]);
  const updDep = (id: string, patch: Partial<Dependente>) =>
    set("dependentes", form.dependentes.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const rmDep = (id: string) => set("dependentes", form.dependentes.filter((d) => d.id !== id));

  const onUpload = async (files: FileList | null) => {
    if (!files) return;
    const docs: DocAnexo[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} excede 5 MB.`); continue; }
      const data = await readFileAsDataURL(file);
      docs.push({
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name, size: file.size, type: file.type, data,
        uploadedAt: new Date().toISOString(),
      });
    }
    set("documentos", [...form.documentos, ...docs]);
  };
  const rmDoc = (id: string) => set("documentos", form.documentos.filter((d) => d.id !== id));

  const onCepBlur = async () => {
    const data = await fetchCep(form.cep);
    if (!data) return;
    setForm((f) => ({
      ...f,
      endereco: f.endereco || data.logradouro.toUpperCase(),
      bairro: f.bairro || data.bairro.toUpperCase(),
      municipio: f.municipio || data.localidade.toUpperCase(),
      estado: f.estado || data.uf,
    }));
    toast.success("Endereço preenchido pelo CEP.");
  };

  // 🔥 CORREÇÃO: Função assíncrona
  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.name.trim()) { toast.error("Informe o nome."); return; }
    await employeesStore.update(employee.id, {
      ...form,
      role: form.cargoFuncao || form.role,
      site: form.organograma || form.site,
      phone: form.telefone || form.phone,
    });
    toast.success("Funcionário atualizado.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar funcionário</DialogTitle>
          <DialogDescription>Edite todos os campos do cadastro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Foto</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-4">
              <div className="relative">
                {form.photo ? (
                  <img src={form.photo} alt={form.name} className="h-32 w-32 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-muted">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 hover:bg-muted/40 text-sm">
                <Camera className="h-4 w-4 text-accent" />
                <span>Escolher foto</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Foto excede 5 MB.");
                        return;
                      }
                      const data = await readFileAsDataURL(file);
                      set("photo", data);
                    }
                  }} 
                />
              </label>
              {form.photo && (
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  className="text-destructive"
                  onClick={() => set("photo", "")}
                >
                  Remover foto
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-base">Dados pessoais</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Field label="Nome completo" required className="md:col-span-2">
                <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="CPF"><Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} /></Field>
              <Field label="Nascimento"><Input type="date" value={form.nascimento} onChange={(e) => set("nascimento", e.target.value)} /></Field>
              <Field label="Sexo">
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v as Employee["sexo"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estado civil">
                <Select value={form.estadoCivil} onValueChange={(v) => set("estadoCivil", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"].map((x) =>
                      <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Grau de instrução">
                <Input value={form.grauInstrucao} onChange={(e) => set("grauInstrucao", e.target.value)} />
              </Field>
              <Field label="RG"><Input value={form.rg} onChange={(e) => set("rg", e.target.value)} /></Field>
              <Field label="CTPS"><Input value={form.ctps} onChange={(e) => set("ctps", e.target.value)} /></Field>
              <Field label="PIS"><Input value={form.pis} onChange={(e) => set("pis", e.target.value)} /></Field>
              <Field label="Nome da mãe"><Input value={form.nomeMae} onChange={(e) => set("nomeMae", e.target.value)} /></Field>
              <Field label="Nome do pai"><Input value={form.nomePai ?? ""} onChange={(e) => set("nomePai", e.target.value)} /></Field>
              <Field label="UF Sindicato">
                <Select value={form.sindicatoUf} onValueChange={(v) => { set("sindicatoUf", v); set("sindicato", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UFS.map((u) => <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Sindicato" className="md:col-span-2">
                <Select value={form.sindicato} onValueChange={(v) => set("sindicato", v)} disabled={!form.sindicatoUf}>
                  <SelectTrigger><SelectValue placeholder={form.sindicatoUf ? "Selecione" : "Selecione UF"} /></SelectTrigger>
                  <SelectContent>{sindUF.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-base">Endereço</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Field label="CEP">
                <Input value={form.cep} onChange={(e) => set("cep", e.target.value)} onBlur={onCepBlur} />
              </Field>
              <Field label="Endereço" className="md:col-span-2">
                <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
              </Field>
              <Field label="Número"><Input value={form.enderecoNumero} onChange={(e) => set("enderecoNumero", e.target.value)} /></Field>
              <Field label="Complemento"><Input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} /></Field>
              <Field label="Bairro"><Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} /></Field>
              <Field label="Município"><Input value={form.municipio} onChange={(e) => set("municipio", e.target.value)} /></Field>
              <Field label="UF">
                <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UFS.map((u) => <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Telefone"><Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></Field>
              <Field label="Telefone recado"><Input value={form.telefoneRecado} onChange={(e) => set("telefoneRecado", e.target.value)} /></Field>
              <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-base">Contrato</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Field label="Status">
                <Select value={form.status as string} onValueChange={(v) => set("status", v as EmployeeStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admissao">Em admissão</SelectItem>
                    <SelectItem value="mobilizacao">Mobilização</SelectItem>
                    <SelectItem value="efetivo">Efetivo</SelectItem>
                    <SelectItem value="ferias">Em férias</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                    <SelectItem value="desligado">Desligado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Admissão"><Input type="date" value={form.admission} onChange={(e) => set("admission", e.target.value)} /></Field>
              <Field label="Obra">
                <Select value={form.organograma} onValueChange={(v) => { set("organograma", v); set("site", v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Cargo / Função">
                <Input value={form.cargoFuncao} onChange={(e) => { set("cargoFuncao", e.target.value); set("role", e.target.value); }} />
              </Field>
              <Field label="Departamento (automático)">
                <Input value={form.departamento} disabled />
              </Field>
              <Field label="Escala/Horário">
                <Select value={form.escalaHorario} onValueChange={(v) => set("escalaHorario", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {horarios.map((h) => <SelectItem key={h.id} value={h.nome}>{h.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Salário/hora">
                <Input type="number" step="0.01" value={form.salarioHora || ""} onChange={(e) => set("salarioHora", parseFloat(e.target.value) || 0)} />
              </Field>
              <Field label="Salário base mensal">
                <Input type="number" step="0.01" value={form.salary || ""} onChange={(e) => set("salary", parseFloat(e.target.value) || 0)} />
              </Field>
              <Field label="% Periculosidade"><Input type="number" value={form.percentualPericulosidade || ""} onChange={(e) => set("percentualPericulosidade", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="% Insalubridade"><Input type="number" value={form.percentualInsalubridade || ""} onChange={(e) => set("percentualInsalubridade", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Ajuda de custo"><Input type="number" step="0.01" value={form.ajudaCusto || ""} onChange={(e) => set("ajudaCusto", parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Período experiência">
                <Select value={form.periodoExperiencia} onValueChange={(v) => set("periodoExperiencia", v as Employee["periodoExperiencia"])}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30/30">30/30</SelectItem>
                    <SelectItem value="45/45">45/45</SelectItem>
                    <SelectItem value="60/60">60/60</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="VT/Adiantamento/VA" className="md:col-span-3">
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.vt} onCheckedChange={(c) => set("vt", !!c)} /> VT
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.adiantamento} onCheckedChange={(c) => set("adiantamento", !!c)} /> Adiantamento
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.valeAlimentacao} onCheckedChange={(c) => set("valeAlimentacao", !!c)} /> Vale Alimentação
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.primeiroEmprego} onCheckedChange={(c) => set("primeiroEmprego", !!c)} /> 1º emprego
                  </label>
                </div>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-base">Pagamento</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Field label="Banco"><Input value={form.bank.bank} onChange={(e) => set("bank", { ...form.bank, bank: e.target.value })} /></Field>
              <Field label="Agência"><Input value={form.bank.agency} onChange={(e) => set("bank", { ...form.bank, agency: e.target.value })} /></Field>
              <Field label="Conta"><Input value={form.bank.account} onChange={(e) => set("bank", { ...form.bank, account: e.target.value })} /></Field>
              <Field label="Tipo">
                <RadioGroup value={form.bank.type} onValueChange={(v) => set("bank", { ...form.bank, type: v as "CC" | "CP" })} className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="CC" /> CC</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="CP" /> CP</label>
                </RadioGroup>
              </Field>
              <Field label="PIX" className="md:col-span-2">
                <Input value={form.bank.pix} onChange={(e) => set("bank", { ...form.bank, pix: e.target.value })} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-base">Dependentes</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addDep}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.dependentes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum dependente.</p>}
              {form.dependentes.map((d) => (
                <div key={d.id} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-6">
                  <Input placeholder="Nome" value={d.nome} onChange={(e) => updDep(d.id, { nome: e.target.value })} className="md:col-span-2" />
                  <Input placeholder="CPF" value={d.cpf} onChange={(e) => updDep(d.id, { cpf: e.target.value })} />
                  <Input type="date" value={d.nascimento} onChange={(e) => updDep(d.id, { nascimento: e.target.value })} />
                  <Input placeholder="Parentesco" value={d.parentesco} onChange={(e) => updDep(d.id, { parentesco: e.target.value })} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => rmDep(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-base">Documentos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-3 hover:bg-muted/40">
                <Upload className="h-4 w-4 text-accent" />
                <span className="flex-1 text-sm">Clique para anexar (até 5 MB cada)</span>
                <input type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
              </label>
              {form.documentos.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="flex-1 truncate text-sm">{d.name}</span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => rmDoc(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit"><Save className="mr-1 h-4 w-4" /> Salvar alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}