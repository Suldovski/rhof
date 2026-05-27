import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Plus, Search, Download, ChevronRight, Upload, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { importFromFile } from "@/lib/employees-import-fixed";
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
import { useRouteProtection, roleChecks } from "@/lib/route-protection";

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
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <PageShell
      eyebrow="Quadro de pessoal"
      title="Funcionários"
      description={`${employees.length} colaboradores cadastrados em ${sites.length} canteiros.`}
      actions={
        <>
          <input
            ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { await importFromFile(f); } catch (err: any) { toast.error("Falha: " + (err?.message ?? err)); }
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Importar planilha
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
        <div className="hidden md:grid grid-cols-[100px_1.5fr_1fr_1fr_140px_40px] items-center gap-3 border-b border-border bg-muted/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Matrícula</div>
          <div>Nome / Função</div>
          <div>Obra</div>
          <div>Departamento</div>
          <div>Status</div>
          <div />
        </div>
        <ul className="divide-y divide-border">
          {filtered.map((e) => (
            <li key={e.id}>
              {/* Desktop row */}
              <Link
                to="/funcionarios/$id" params={{ id: e.id }}
                className="hidden md:grid grid-cols-[100px_1.5fr_1fr_1fr_140px_40px] items-center gap-3 px-5 py-4 transition hover:bg-muted/50"
              >
                <div className="font-mono text-xs text-muted-foreground">#{e.id}</div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {e.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.role}</p>
                  </div>
                </div>
                <div className="truncate text-sm">{e.site}</div>
                <div className="text-sm">{e.departamento || e.department}</div>
                <div><StatusBadge status={e.status} /></div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              {/* Mobile card */}
              <Link
                to="/funcionarios/$id" params={{ id: e.id }}
                className="flex md:hidden items-center gap-3 px-4 py-3 transition active:bg-muted/60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {e.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-sm">{e.name}</p>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">#{e.id}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{e.role}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <StatusBadge status={e.status} />
                    {e.site && <span className="truncate text-[11px] text-muted-foreground">{e.site}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted-foreground">
              Nenhum funcionário encontrado.
            </li>
          )}
        </ul>
      </Card>
    </PageShell>
  );
}
