import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Plus, Search, Download, ChevronRight, Upload, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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

export const Route = createFileRoute("/funcionarios/")({
  head: () => ({ meta: [{ title: "Funcionários · Bucagrans RH" }] }),
  component: List,
});

function normKey(s: any): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseAnyDate(v: any): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && isFinite(v)) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return s.slice(0, 10);
  return "";
}

function parseNumberBR(v: any): number {
  if (typeof v === "number") return v;
  if (v == null) return 0;
  const s = String(v).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function mapStatus(v: any): EmployeeStatus {
  const s = normKey(v);
  if (s.includes("ferias")) return "ferias";
  if (s.includes("afast")) return "afastado";
  if (s.includes("deslig") || s.includes("demit") || s.includes("inativ")) return "desligado";
  if (s.includes("mobiliz")) return "mobilizacao";
  if (s.includes("admiss")) return "admissao";
  if (s.includes("efetiv") || s.includes("ativ")) return "efetivo";
  return "efetivo";
}

function findCol(headers: string[], terms: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    if (terms.some((t) => h === t || h.includes(t))) return i;
  }
  return -1;
}

async function importFromFile(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  if (rows.length < 2) { toast.error("Planilha vazia."); return; }

  let headerIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const keys = rows[i].map(normKey);
    const score =
      (keys.some((k) => k.includes("nome")) ? 2 : 0) +
      (keys.some((k) => k.includes("cpf")) ? 2 : 0) +
      (keys.some((k) => k.includes("obra")) ? 1 : 0) +
      (keys.some((k) => k.includes("funcao") || k === "cargo") ? 1 : 0) +
      (keys.some((k) => k.includes("admiss")) ? 1 : 0);
    if (score > bestScore) { bestScore = score; headerIdx = i; }
  }
  if (headerIdx < 0 || bestScore < 2) {
    toast.error("Não encontrei cabeçalho com NOME na planilha.");
    return;
  }

  const headers = rows[headerIdx].map(normKey);
  const col = {
    id:        findCol(headers, ["re", "matricula"]),
    name:      findCol(headers, ["nome", "funcionario"]),
    cpf:       findCol(headers, ["cpf"]),
    nasc:      findCol(headers, ["datanasc", "nascimento"]),
    admission: findCol(headers, ["dataadmissao", "datadeadmissao", "admissao"]),
    role:      findCol(headers, ["funcao", "cargo"]),
    site:      findCol(headers, ["obra"]),
    salHora:   findCol(headers, ["salariohora", "salhora", "hora"]),
    salMensal: findCol(headers, ["salariomensal", "salmensal", "mensal", "salario"]),
    status:    findCol(headers, ["situacao", "status"]),
  };

  if (col.name < 0) { toast.error("Coluna NOME não encontrada."); return; }

  let created = 0;
  const reasons: Record<string, number> = {};
  const skip = (r: string) => { reasons[r] = (reasons[r] ?? 0) + 1; };
  const existingSites = new Set(sitesStore.list().map((s) => s.name.toLowerCase()));

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === "" || c == null)) continue;
    const name = String(row[col.name] ?? "").trim();
    if (!name) { skip("nome vazio"); continue; }
    const cpf = col.cpf >= 0 ? String(row[col.cpf] ?? "").trim() : "";
    const site = col.site >= 0 ? String(row[col.site] ?? "").trim() : "";
    if (site && !existingSites.has(site.toLowerCase())) {
      try {
        sitesStore.add({
          id: slugify(site) || `obra-${Date.now()}`,
          name: site, status: "Em execução",
          start: new Date().toISOString().slice(0, 10), manager: "—",
        });
        existingSites.add(site.toLowerCase());
      } catch {}
    }
    const role = col.role >= 0 ? String(row[col.role] ?? "").trim() : "";
    const salHora = col.salHora >= 0 ? parseNumberBR(row[col.salHora]) : 0;
    const salMen = col.salMensal >= 0 ? parseNumberBR(row[col.salMensal]) : 0;
    const idRaw = col.id >= 0 ? row[col.id] : undefined;
    const id = idRaw != null && idRaw !== "" ? String(idRaw).trim() : undefined;
    try {
      employeesStore.add({
        id, name, cpf,
        nascimento: col.nasc >= 0 ? parseAnyDate(row[col.nasc]) : "",
        admission: col.admission >= 0 ? parseAnyDate(row[col.admission]) : "",
        role, cargoFuncao: role,
        site, organograma: site,
        status: col.status >= 0 ? mapStatus(row[col.status]) : "efetivo",
        salary: salMen || salHora * 220, salarioHora: salHora,
      });
      created++;
    } catch (err: any) {
      const msg = err?.message ?? "erro";
      if (msg.includes("matrícula") && id) {
        try {
          employeesStore.add({
            name, cpf,
            nascimento: col.nasc >= 0 ? parseAnyDate(row[col.nasc]) : "",
            admission: col.admission >= 0 ? parseAnyDate(row[col.admission]) : "",
            role, cargoFuncao: role,
            site, organograma: site,
            status: col.status >= 0 ? mapStatus(row[col.status]) : "efetivo",
            salary: salMen || salHora * 220, salarioHora: salHora,
          });
          created++;
        } catch (e2: any) { skip(e2?.message ?? "erro"); }
      } else skip(msg);
    }
  }

  const skipped = Object.values(reasons).reduce((a, b) => a + b, 0);
  if (created === 0) {
    toast.error(`Nenhum importado. ${Object.entries(reasons).map(([r,n])=>`${n}× ${r}`).join(" · ")}`);
  } else {
    toast.success(`Importação: ${created} criado(s)${skipped ? `, ${skipped} ignorado(s)` : ""}.`);
  }
}

type TabKey = "todos" | "efetivo" | "pj" | "terceiro" | "mobilizacao" | "ferias";
type DeptKey = "todos" | "Operacional" | "Administrativo";

function isPJ(e: Employee): boolean {
  return e.tipo === "pj" || /^pj/i.test(e.id);
}
function isTerceiro(e: Employee): boolean {
  return e.tipo === "terceiro";
}

function List() {
  const sites = useSites();
  const employees = useEmployees();
  const [q, setQ] = useState("");
  const [site, setSite] = useState<string>("todos");
  const [tab, setTab] = useState<TabKey>("todos");
  const [dept, setDept] = useState<DeptKey>("todos");
  const fileRef = useRef<HTMLInputElement>(null);

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
