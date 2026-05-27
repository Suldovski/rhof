import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Download, ChevronRight, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { employeesStore, useEmployees, type Employee, type EmployeeStatus } from "@/lib/employees";
import { sitesStore, useSites, slugify } from "@/lib/sites-store";
import { downloadEmployeesPDF } from "@/lib/employees-pdf";
import { canAccessFuncionarios, canEditFuncionarios } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-store";
import { EmployeesImportDialog } from "@/components/employees-import-dialog";

export const Route = createFileRoute("/funcionarios/")({
  head: () => ({ meta: [{ title: "Funcionários · Bucagrans RH" }] }),
  component: List,
});

type TabKey = "todos" | "efetivo" | "pj" | "terceiro" | "mobilizacao" | "ferias";
type DeptKey = "todos" | "Operacional" | "Administrativo";

function isPJ(e: Employee): boolean {
  return e.tipo === "pj" || /^pj/i.test(e.id);
}
function isTerceiro(e: Employee): boolean {
  return e.tipo === "terceiro";
}

function List() {
  const auth = useAuth();
  const navigate = useNavigate();
  const sites = useSites();
  const employees = useEmployees();
  const [q, setQ] = useState("");
  const [site, setSite] = useState<string>("todos");
  const [tab, setTab] = useState<TabKey>("todos");
  const [dept, setDept] = useState<DeptKey>("todos");
  const [importOpen, setImportOpen] = useState(false);

  // Verificar permissão de acesso
  if (!auth.loading && auth.currentUser && !canAccessFuncionarios(auth.currentUser.role)) {
    if (typeof window !== "undefined") {
      toast.error("Você não tem permissão para acessar esta página.");
      navigate({ to: "/" });
    }
    return null;
  }

  const matchTab = (e: Employee): boolean => {
    if (tab === "todos") return true;
    if (tab === "pj") return isPJ(e);
    if (tab === "terceiro") return isTerceiro(e);
    if (tab === "efetivo") return !isPJ(e) && !isTerceiro(e) && (e.status === "efetivo" || (e.status as any) === "ativo");
    if (tab === "mobilizacao") return !isPJ(e) && !isTerceiro(e) && (e.status === "mobilizacao" || e.status === "admissao");
    return e.status === tab;
  };

  const matchDept = (e: Employee): boolean => {
    if (dept === "todos") return true;
    return (e.departamento || e.department) === dept;
  };

  const filtered = useMemo(() => {
    const list = employees.filter((e) => {
      const matchesQ = !q || e.name.toLowerCase().includes(q.toLowerCase())
        || e.cpf.includes(q) || e.id.toLowerCase().includes(q.toLowerCase());
      const matchesSite = site === "todos" || e.site === site;
      return matchesQ && matchesSite && matchTab(e) && matchDept(e);
    });
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [employees, q, site, tab, dept]);

  const counts = useMemo(() => ({
    todos: employees.length,
    efetivo: employees.filter((e) => !isPJ(e) && !isTerceiro(e) && (e.status === "efetivo" || (e.status as any) === "ativo")).length,
    pj: employees.filter(isPJ).length,
    terceiro: employees.filter(isTerceiro).length,
    mobilizacao: employees.filter((e) => !isPJ(e) && !isTerceiro(e) && (e.status === "mobilizacao" || e.status === "admissao")).length,
    ferias: employees.filter((e) => e.status === "ferias").length,
  }), [employees]);

  const exportPDF = (siteName?: string) => {
    const list = siteName ? employees.filter((e) => e.site === siteName) : employees;
    if (list.length === 0) { toast.error("Sem funcionários para exportar."); return; }
    downloadEmployeesPDF(list, siteName ? { siteName } : {});
    toast.success("PDF gerado.");
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
  };

  const formatMoney = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const displayValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  return (
    <PageShell
      eyebrow="Quadro de pessoal"
      title="Funcionários"
      description={`${employees.length} colaboradores cadastrados em ${sites.length} canteiros.`}
      actions={
        <>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Importar planilha
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive">
                <Trash2 className="mr-1 h-4 w-4" /> Apagar todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar TODOS os funcionários?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação remove permanentemente todos os {employees.length} cadastros. Não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { employeesStore.removeAll(); toast.success("Todos os funcionários foram apagados."); }}
                >Apagar tudo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button asChild>
            <Link to="/funcionarios/novo"><Plus className="mr-1 h-4 w-4" /> Novo</Link>
          </Button>
        </>
      }
    >
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-md border border-input px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, CPF ou matrícula"
            className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <Select value={site} onValueChange={setSite}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Obra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as obras</SelectItem>
            {sites.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dept} onValueChange={(v) => setDept(v as DeptKey)}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Departamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os deptos</SelectItem>
            <SelectItem value="Operacional">Operacional</SelectItem>
            <SelectItem value="Administrativo">Administrativo</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <FileText className="mr-1 h-4 w-4" /> Exportar PDF
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
            <DropdownMenuLabel>Escolha a obra</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportPDF()}>Todas as obras</DropdownMenuItem>
            <DropdownMenuSeparator />
            {sites.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => exportPDF(s.name)}>
                {s.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <TabsList className="w-max md:w-auto">
          <TabsTrigger value="todos">Todos ({counts.todos})</TabsTrigger>
          <TabsTrigger value="efetivo">Efetivos ({counts.efetivo})</TabsTrigger>
          <TabsTrigger value="pj">PJ ({counts.pj})</TabsTrigger>
          <TabsTrigger value="terceiro">Terceiros ({counts.terceiro})</TabsTrigger>
          <TabsTrigger value="mobilizacao">Mobilização ({counts.mobilizacao})</TabsTrigger>
          <TabsTrigger value="ferias">Férias ({counts.ferias})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="border-b border-border px-4 py-3 text-left">RE</th>
                <th className="border-b border-border px-4 py-3 text-left">Nome</th>
                <th className="border-b border-border px-4 py-3 text-left">CPF</th>
                <th className="border-b border-border px-4 py-3 text-left">Data Nasc.</th>
                <th className="border-b border-border px-4 py-3 text-left">Data Admissão</th>
                <th className="border-b border-border px-4 py-3 text-left">CBO</th>
                <th className="border-b border-border px-4 py-3 text-left">Função</th>
                <th className="border-b border-border px-4 py-3 text-left">Obra</th>
                <th className="border-b border-border px-4 py-3 text-left">Salário Hora</th>
                <th className="border-b border-border px-4 py-3 text-left">Salário Mensal</th>
                <th className="border-b border-border px-4 py-3 text-left">Término 30 dias</th>
                <th className="border-b border-border px-4 py-3 text-left">Término 60 dias</th>
                <th className="border-b border-border px-4 py-3 text-left">Status</th>
                <th className="border-b border-border px-4 py-3 text-right">Abrir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e) => (
                <tr key={e.id} className="transition hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{displayValue(e.reImport ?? e.id)}</td>
                  <td className="px-4 py-3 font-semibold">{displayValue(e.nomeImport ?? e.name)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{displayValue(e.cpfDigits ?? e.cpf)}</td>
                  <td className="px-4 py-3">{formatDate(e.dataNascimentoImport ?? e.nascimento)}</td>
                  <td className="px-4 py-3">{formatDate(e.dataAdmissaoImport ?? e.admission)}</td>
                  <td className="px-4 py-3">{displayValue(e.cbo)}</td>
                  <td className="px-4 py-3">{displayValue(e.funcaoImport ?? e.role)}</td>
                  <td className="px-4 py-3">{displayValue(e.obraImport ?? e.site)}</td>
                  <td className="px-4 py-3">{formatMoney(e.salarioHoraImport ?? e.salarioHora)}</td>
                  <td className="px-4 py-3">{formatMoney(e.salarioMensalImport ?? e.salary)}</td>
                  <td className="px-4 py-3">{formatDate(e.termino30Dias)}</td>
                  <td className="px-4 py-3">{formatDate(e.termino60Dias)}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/funcionarios/$id" params={{ id: e.id }}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <EmployeesImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </PageShell>
  );
}
