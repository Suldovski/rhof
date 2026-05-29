import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Save, Plus, Trash2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSites } from "@/lib/sites-store";
import { useHorarios } from "@/lib/horarios-store";
import { fetchCep } from "@/lib/cep";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { employeesStore, makeEmpty, type Employee, type Dependente, type DocAnexo, type EmployeeStatus } from "@/lib/employees";
import { UFS, SINDICATOS_POR_UF } from "@/lib/sindicatos";
import { readFileAsDataURL } from "@/lib/doc-templates-store";
import { useAuth } from "@/lib/auth-store";
import { useRouteProtection, roleChecks } from "@/lib/route-protection";

export const Route = createFileRoute("/funcionarios/novo")({
  head: () => ({ meta: [{ title: "Novo cadastro · SIGA" }] }),
  component: NewEmployee,
});

function NewEmployee() {
  const navigate = useNavigate();
  const sites = useSites();
  const horarios = useHorarios();
  const auth = useAuth();
  useRouteProtection(roleChecks.funcionarios, "Funcionários");
  const [form, setForm] = useState<Employee>(() => makeEmpty());
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill obra/site when coming from obra detail (?site=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("site");
      if (s) {
        setForm((f) => ({ ...f, organograma: s, site: s }));
      }
    } catch {}
  }, []);

  const set = <K extends keyof Employee>(k: K, v: Employee[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const sindicatosUF = useMemo(
    () => (form.sindicatoUf ? SINDICATOS_POR_UF[form.sindicatoUf] ?? [] : []),
    [form.sindicatoUf],
  );

  // Dependentes
  const addDep = () =>
    set("dependentes", [
      ...form.dependentes,
      { id: `d-${Date.now()}`, nome: "", cpf: "", nascimento: "", cidade: "", uf: "", parentesco: "" },
    ]);
  const updDep = (id: string, patch: Partial<Dependente>) =>
    set("dependentes", form.dependentes.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const rmDep = (id: string) => set("dependentes", form.dependentes.filter((d) => d.id !== id));

  // Anexos
  const onUpload = async (files: FileList | null) => {
    if (!files) return;
    const docs: DocAnexo[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede 5 MB.`);
        continue;
      }
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Obrigatórios: dados pessoais, estado civil, dados para contrato, info pagamento, nome da mãe
    const requiredOk =
      form.name && form.cpf && form.nascimento && form.estadoCivil &&
      form.admission && form.organograma && form.cargoFuncao &&
      form.bank.bank && form.bank.agency && form.bank.account &&
      form.nomeMae;
    if (!requiredOk) {
      toast.error("Preencha todos os campos obrigatórios (marcados com *).");
      return;
    }
    setSubmitting(true);
    try {
      const saved = employeesStore.add(form);
      toast.success(`Funcionário ${saved.name} cadastrado (matrícula #${saved.id}).`);
      navigate({ to: "/funcionarios/$id", params: { id: saved.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao cadastrar.");
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      eyebrow="Admissão · FRE"
      title="Novo funcionário"
      description="Ficha para Registro de Empregado (FRE) — preencha conforme exigência da contabilidade."
      actions={
        <Button variant="outline" asChild>
          <Link to="/funcionarios"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* FOTO */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Foto do colaborador</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            {form.photo ? (
              <img src={form.photo} alt="Foto" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">Sem foto</div>
            )}
            <label className="cursor-pointer">
              <input
                type="file" accept="image/*" className="hidden"
                onChange={async (ev) => {
                  const file = ev.target.files?.[0]; if (!file) return;
                  if (file.size > 3 * 1024 * 1024) { toast.error("Foto deve ter no máximo 3 MB."); return; }
                  const data = await readFileAsDataURL(file);
                  set("photo", data);
                }}
              />
              <span className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">
                <Upload className="h-4 w-4" /> {form.photo ? "Trocar foto" : "Anexar foto"}
              </span>
            </label>
            {form.photo && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set("photo", "")}>Remover</Button>
            )}
          </CardContent>
        </Card>

        {/* TIPO DE CONTRATO */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Tipo de contrato</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Tipo">
              <Select value={form.tipo ?? "efetivo"} onValueChange={(v) => set("tipo", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efetivo">Efetivo (CLT)</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                  <SelectItem value="terceiro">Terceiro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {(form.tipo === "pj" || form.tipo === "terceiro") && (
              <Field label="Empresa" className="md:col-span-2">
                <Input value={form.empresaTerceiro ?? ""} onChange={(e) => set("empresaTerceiro", e.target.value)} placeholder="Razão social da empresa" />
              </Field>
            )}
          </CardContent>
        </Card>

        {/* DADOS PESSOAIS */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Dados pessoais *</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Nome completo" required className="md:col-span-2">
              <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="CPF" required>
              <Input required value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" />
            </Field>
            <Field label="Data de nascimento" required>
              <Input type="date" required value={form.nascimento} onChange={(e) => set("nascimento", e.target.value)} />
            </Field>
            <Field label="Sexo">
              <Select value={form.sexo} onValueChange={(v) => set("sexo", v as Employee["sexo"])}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Raça/cor">
              <Select value={form.racaCor} onValueChange={(v) => set("racaCor", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["Branca", "Preta", "Parda", "Amarela", "Indígena", "Não informado"].map((x) =>
                    <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estado civil" required>
              <Select value={form.estadoCivil} onValueChange={(v) => set("estadoCivil", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)", "Separado(a)"].map((x) =>
                    <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Grau de instrução">
              <Select value={form.grauInstrucao} onValueChange={(v) => set("grauInstrucao", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {[
                    "Analfabeto", "Fundamental Incompleto", "Fundamental Completo",
                    "Médio Incompleto", "Médio Completo", "Superior Incompleto",
                    "Superior Completo", "Pós-graduação", "Mestrado", "Doutorado",
                  ].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Deficiência física">
              <Input value={form.deficienciaFisica} onChange={(e) => set("deficienciaFisica", e.target.value)} placeholder="Não / descrever" />
            </Field>
            <Field label="Nacionalidade">
              <Input value={form.nacionalidade} onChange={(e) => set("nacionalidade", e.target.value)} />
            </Field>
            <Field label="RNE (se estrangeiro)">
              <Input value={form.rne} onChange={(e) => set("rne", e.target.value)} />
            </Field>
            <Field label="Município de nascimento">
              <Input value={form.municipioNascimento} onChange={(e) => set("municipioNascimento", e.target.value)} />
            </Field>
            <Field label="Estado de nascimento">
              <Select value={form.estadoNascimento} onValueChange={(v) => set("estadoNascimento", v)}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UFS.map((u) => <SelectItem key={u.uf} value={u.uf}>{u.uf} — {u.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="UF Sindicato">
              <Select value={form.sindicatoUf} onValueChange={(v) => { set("sindicatoUf", v); set("sindicato", ""); }}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UFS.map((u) => <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Sindicato" className="md:col-span-2">
              <Select value={form.sindicato} onValueChange={(v) => set("sindicato", v)} disabled={!form.sindicatoUf}>
                <SelectTrigger><SelectValue placeholder={form.sindicatoUf ? "Selecione" : "Selecione UF primeiro"} /></SelectTrigger>
                <SelectContent>{sindicatosUF.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        {/* ENDEREÇO */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Endereço</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <Field label="Endereço" className="md:col-span-2">
              <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
            </Field>
            <Field label="Número"><Input value={form.enderecoNumero} onChange={(e) => set("enderecoNumero", e.target.value)} /></Field>
            <Field label="CEP">
              <Input
                value={form.cep}
                onChange={(e) => set("cep", e.target.value)}
                onBlur={async () => {
                  const d = await fetchCep(form.cep);
                  if (!d) return;
                  setForm((f) => ({
                    ...f,
                    endereco: f.endereco || d.logradouro.toUpperCase(),
                    bairro: f.bairro || d.bairro.toUpperCase(),
                    municipio: f.municipio || d.localidade.toUpperCase(),
                    estado: f.estado || d.uf,
                  }));
                  toast.success("Endereço preenchido pelo CEP.");
                }}
              />
            </Field>
            <Field label="Complemento"><Input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} /></Field>
            <Field label="Bairro"><Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} /></Field>
            <Field label="Município"><Input value={form.municipio} onChange={(e) => set("municipio", e.target.value)} /></Field>
            <Field label="Estado">
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UFS.map((u) => <SelectItem key={u.uf} value={u.uf}>{u.uf}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Telefone"><Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></Field>
            <Field label="Telefone recado"><Input value={form.telefoneRecado} onChange={(e) => set("telefoneRecado", e.target.value)} /></Field>
            <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          </CardContent>
        </Card>

        {/* CNH */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">CNH (se possuir)</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Nº CNH"><Input value={form.cnh?.numero ?? ""} onChange={(e) => set("cnh", { ...(form.cnh ?? { numero: "", primeiraHabilitacao: "", expedicao: "", validade: "", uf: "", categoria: "" }), numero: e.target.value })} /></Field>
            <Field label="Categoria"><Input value={form.cnh?.categoria ?? ""} onChange={(e) => set("cnh", { ...(form.cnh ?? { numero: "", primeiraHabilitacao: "", expedicao: "", validade: "", uf: "", categoria: "" }), categoria: e.target.value })} /></Field>
            <Field label="UF"><Input value={form.cnh?.uf ?? ""} onChange={(e) => set("cnh", { ...(form.cnh ?? { numero: "", primeiraHabilitacao: "", expedicao: "", validade: "", uf: "", categoria: "" }), uf: e.target.value })} /></Field>
            <Field label="1ª habilitação"><Input type="date" value={form.cnh?.primeiraHabilitacao ?? ""} onChange={(e) => set("cnh", { ...(form.cnh ?? { numero: "", primeiraHabilitacao: "", expedicao: "", validade: "", uf: "", categoria: "" }), primeiraHabilitacao: e.target.value })} /></Field>
            <Field label="Expedição"><Input type="date" value={form.cnh?.expedicao ?? ""} onChange={(e) => set("cnh", { ...(form.cnh ?? { numero: "", primeiraHabilitacao: "", expedicao: "", validade: "", uf: "", categoria: "" }), expedicao: e.target.value })} /></Field>
            <Field label="Validade"><Input type="date" value={form.cnh?.validade ?? ""} onChange={(e) => set("cnh", { ...(form.cnh ?? { numero: "", primeiraHabilitacao: "", expedicao: "", validade: "", uf: "", categoria: "" }), validade: e.target.value })} /></Field>
          </CardContent>
        </Card>

        {/* DADOS PARA CONTRATO */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Dados para contrato *</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Data de admissão" required>
              <Input type="date" required value={form.admission} onChange={(e) => set("admission", e.target.value)} />
            </Field>
            <Field label="Organograma (obra)" required>
              <Select value={form.organograma} onValueChange={(v) => { set("organograma", v); set("site", v); }}>
                <SelectTrigger><SelectValue placeholder="Selecione obra" /></SelectTrigger>
                <SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status inicial">
              <Select value={form.status as string} onValueChange={(v) => set("status", v as EmployeeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admissao">Em admissão</SelectItem>
                  <SelectItem value="mobilizacao">Mobilização</SelectItem>
                  <SelectItem value="efetivo">Efetivo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cargo / Função" required>
              <Input required value={form.cargoFuncao} onChange={(e) => { set("cargoFuncao", e.target.value); set("role", e.target.value); }} />
            </Field>
            <Field label="Salário/hora">
              <Input type="number" step="0.01" value={form.salarioHora || ""} onChange={(e) => set("salarioHora", parseFloat(e.target.value) || 0)} />
            </Field>
            <Field label="Salário base mensal">
              <Input type="number" step="0.01" value={form.salary || ""} onChange={(e) => set("salary", parseFloat(e.target.value) || 0)} />
            </Field>
            <Field label="Período de experiência">
              <Select value={form.periodoExperiencia} onValueChange={(v) => set("periodoExperiencia", v as Employee["periodoExperiencia"])}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30/30">30/30</SelectItem>
                  <SelectItem value="45/45">45/45</SelectItem>
                  <SelectItem value="60/60">60/60</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.periodoExperiencia === "outro" && (
              <Field label="Outro per. experiência">
                <Input value={form.periodoExperienciaOutro} onChange={(e) => set("periodoExperienciaOutro", e.target.value)} />
              </Field>
            )}
            <Field label="Escala/Horário">
              <Select value={form.escalaHorario} onValueChange={(v) => set("escalaHorario", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {horarios.map((h) => <SelectItem key={h.id} value={h.nome}>{h.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="CTPS"><Input value={form.ctps} onChange={(e) => set("ctps", e.target.value)} /></Field>
            <Field label="PIS/PASEP"><Input value={form.pis} onChange={(e) => set("pis", e.target.value)} /></Field>
            <Field label="RG"><Input value={form.rg} onChange={(e) => set("rg", e.target.value)} /></Field>
            <Field label="% Periculosidade"><Input type="number" value={form.percentualPericulosidade || ""} onChange={(e) => set("percentualPericulosidade", parseFloat(e.target.value) || 0)} /></Field>
            <Field label="% Insalubridade"><Input type="number" value={form.percentualInsalubridade || ""} onChange={(e) => set("percentualInsalubridade", parseFloat(e.target.value) || 0)} /></Field>
            <Field label="Ajuda de custo (R$)"><Input type="number" step="0.01" value={form.ajudaCusto || ""} onChange={(e) => set("ajudaCusto", parseFloat(e.target.value) || 0)} /></Field>
            <Field label="Horas extras"><Input value={form.horasExtras} onChange={(e) => set("horasExtras", e.target.value)} placeholder="Ex: 50%/100%" /></Field>

            <Field label="Vale Transporte" className="md:col-span-3">
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.vt} onCheckedChange={(c) => set("vt", !!c)} /> Usa VT
                </label>
                {form.vt && (
                  <>
                    <Input type="number" step="0.01" placeholder="Valor ida" className="w-32" value={form.vtIda || ""} onChange={(e) => set("vtIda", parseFloat(e.target.value) || 0)} />
                    <Input type="number" step="0.01" placeholder="Valor volta" className="w-32" value={form.vtVolta || ""} onChange={(e) => set("vtVolta", parseFloat(e.target.value) || 0)} />
                  </>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.adiantamento} onCheckedChange={(c) => set("adiantamento", !!c)} /> Adiantamento
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.valeAlimentacao} onCheckedChange={(c) => set("valeAlimentacao", !!c)} /> Vale Alimentação
                </label>
                {form.valeAlimentacao && (
                  <Input type="number" step="0.01" placeholder="Desconto VA" className="w-32" value={form.valorDescontoVA || ""} onChange={(e) => set("valorDescontoVA", parseFloat(e.target.value) || 0)} />
                )}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.primeiroEmprego} onCheckedChange={(c) => set("primeiroEmprego", !!c)} /> 1º emprego
                </label>
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* INFORMAÇÕES PARA PAGAMENTO */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Informações para pagamento *</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Banco" required><Input required value={form.bank.bank} onChange={(e) => set("bank", { ...form.bank, bank: e.target.value })} /></Field>
            <Field label="Agência" required><Input required value={form.bank.agency} onChange={(e) => set("bank", { ...form.bank, agency: e.target.value })} /></Field>
            <Field label="Conta" required><Input required value={form.bank.account} onChange={(e) => set("bank", { ...form.bank, account: e.target.value })} /></Field>
            <Field label="Tipo de conta">
              <RadioGroup value={form.bank.type} onValueChange={(v) => set("bank", { ...form.bank, type: v as "CC" | "CP" })} className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="CC" /> Conta Corrente</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="CP" /> Conta Poupança</label>
              </RadioGroup>
            </Field>
            <Field label="Chave PIX" className="md:col-span-2">
              <Input value={form.bank.pix} onChange={(e) => set("bank", { ...form.bank, pix: e.target.value })} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </Field>
          </CardContent>
        </Card>

        {/* FILIAÇÃO + DEPENDENTES */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Filiação *</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Nome da mãe" required><Input required value={form.nomeMae} onChange={(e) => set("nomeMae", e.target.value)} /></Field>
            <Field label="Nome do pai"><Input value={form.nomePai ?? ""} onChange={(e) => set("nomePai", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Dependentes</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addDep}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.dependentes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum dependente cadastrado.</p>}
            {form.dependentes.map((d) => (
              <div key={d.id} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-6">
                <Input placeholder="Nome" value={d.nome} onChange={(e) => updDep(d.id, { nome: e.target.value })} className="md:col-span-2" />
                <Input placeholder="CPF" value={d.cpf} onChange={(e) => updDep(d.id, { cpf: e.target.value })} />
                <Input type="date" placeholder="Nascimento" value={d.nascimento} onChange={(e) => updDep(d.id, { nascimento: e.target.value })} />
                <Input placeholder="Cidade" value={d.cidade} onChange={(e) => updDep(d.id, { cidade: e.target.value })} />
                <div className="flex gap-2">
                  <Input placeholder="UF" value={d.uf} onChange={(e) => updDep(d.id, { uf: e.target.value })} className="w-16" />
                  <Input placeholder="Parentesco" value={d.parentesco} onChange={(e) => updDep(d.id, { parentesco: e.target.value })} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => rmDep(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* DOCUMENTOS ANEXADOS */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Documentos anexados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-4 hover:bg-muted/40">
              <Upload className="h-5 w-5 text-accent" />
              <span className="flex-1 text-sm">Clique para anexar arquivos (PDF, imagem) — até 5 MB cada</span>
              <input type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
            </label>
            {form.documentos.length > 0 && (
              <ul className="space-y-2">
                {form.documentos.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <FileText className="h-4 w-4 text-accent" />
                    <span className="flex-1 truncate text-sm">{d.name}</span>
                    <span className="text-xs text-muted-foreground">{(d.size / 1024).toFixed(0)} KB</span>
                    <Button type="button" size="icon" variant="ghost" onClick={() => rmDoc(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" asChild><Link to="/funcionarios">Cancelar</Link></Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : (<><Save className="mr-1 h-4 w-4" /> Cadastrar funcionário</>)}
          </Button>
        </div>
      </form>
    </PageShell>
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
