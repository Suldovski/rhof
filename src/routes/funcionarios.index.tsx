import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Plus, Search, Filter, Download, ChevronRight, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeesStore, useEmployees, type Employee, type EmployeeStatus } from "@/lib/employees";
import { sitesStore, useSites, slugify } from "@/lib/sites-store";

export const Route = createFileRoute("/funcionarios/")({
  head: () => ({
    meta: [{ title: "Funcionários · Bucagrans RH" }],
  }),
  component: List,
});

type StatusKey = "todos" | "efetivo" | "pj" | "mobilizacao";
type SectorKey = "todos" | "operacional" | "administrativo";

function employeeStatusKey(employee: Employee): StatusKey | "other" {
  if (employee.status === "mobilizacao" || employee.status === "admissao") return "mobilizacao";
  if (employee.tipo === "pj" || /^PJ-/i.test(employee.id)) return "pj";
  if (employee.status === "efetivo" || employee.status === "ativo") return "efetivo";
  return "other";
}

function employeeSectorKey(employee: Employee): SectorKey {
  return employee.department === "Administrativo" ? "administrativo" : "operacional";
}

function exportCSV(rows: Employee[]) {
  const headers = [
    "matricula", "nome", "cpf", "rg", "ctps", "pis", "nascimento",
    "cargo", "departamento", "obra", "admissao", "status",
    "email", "telefone", "endereco", "municipio", "estado", "cep",
    "salario_mensal", "salario_hora",
    "banco", "agencia", "conta", "tipo_conta", "pix",
    "sindicato", "sindicato_uf", "nome_mae",
  ];
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((e) => [
      e.id, e.name, e.cpf, e.rg, e.ctps, e.pis, e.nascimento,
      e.cargoFuncao || e.role, e.departamento || e.department, e.organograma || e.site, e.admission, e.status,
      e.email, e.telefone || e.phone, e.endereco, e.municipio, e.estado, e.cep,
      e.salary, e.salarioHora,
      e.bank?.bank, e.bank?.agency, e.bank?.account, e.bank?.type, e.bank?.pix,
      e.sindicato, e.sindicatoUf, e.nomeMae,
    ].map(esc).join(",")),
  ].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `funcionarios-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${rows.length} funcionário(s) exportado(s).`);
}

function normKey(s: any): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  re: "id", matricula: "id",
  nome: "name", funcionario: "name",
  cpf: "cpf",
  datanasc: "nascimento", datanascimento: "nascimento", nascimento: "nascimento",
  idade: "idade",
  datadeadmissao: "admission", admissao: "admission", dataadmissao: "admission",
  cbo: "cbo",
  funcao: "role", cargo: "role", cargofuncao: "role",
  obra: "site",
  salariohora: "salarioHora", salhora: "salarioHora", hora: "salarioHora",
  salariomensal: "salary", salario: "salary", salmensal: "salary", mensal: "salary",
  situacao: "status", status: "status",
};

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
  return "ativo";
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
  if (headerIdx < 0 || bestScore < 4) {
    toast.error("Não encontrei cabeçalho com NOME e CPF na planilha.");
    console.warn("[import] primeiras linhas:", rows.slice(0, 5));
    return;
  }

  const headers = rows[headerIdx].map(normKey);
  console.info("[import] cabeçalhos detectados:", headers);

  const col = {
    id:        findCol(headers, ["re", "matricula"]),
    name:      findCol(headers, ["nome", "funcionario"]),
    cpf:       findCol(headers, ["cpf"]),
    nasc:      findCol(headers, ["datanasc", "nascimento"]),
    admission: findCol(headers, ["dataadmissao", "datadeadmissao", "admissao"]),
    cbo:       findCol(headers, ["cbo"]),
    role:      findCol(headers, ["funcao", "cargo"]),
    site:      findCol(headers, ["obra"]),
    salHora:   findCol(headers, ["salariohora", "salhora", "hora"]),
    salMensal: findCol(headers, ["salariomensal", "salmensal", "mensal", "salario"]),
    status:    findCol(headers, ["situacao", "status"]),
  };
  console.info("[import] mapeamento de colunas:", col);

  if (col.name < 0) {
    toast.error("Coluna NOME não encontrada na planilha.");
    return;
  }

  let created = 0;
  const reasons: Record<string, number> = {};
  const skipReason = (r: string) => { reasons[r] = (reasons[r] ?? 0) + 1; };
  const existingSites = new Set(sitesStore.list().map((s) => s.name.toLowerCase()));

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === "" || c == null)) continue;

    const name = String(row[col.name] ?? "").trim();
    const cpfRaw = col.cpf >= 0 ? row[col.cpf] : "";
    const cpf = String(cpfRaw ?? "").trim();
    if (!name) { skipReason("nome vazio"); continue; }

    const site = col.site >= 0 ? String(row[col.site] ?? "").trim() : "";
    if (site && !existingSites.has(site.toLowerCase())) {
      try {
        sitesStore.add({
          id: slugify(site) || `obra-${Date.now()}`,
          name: site,
          status: "Em execução",
          start: new Date().toISOString().slice(0, 10),
          manager: "—",
        });
        existingSites.add(site.toLowerCase());
      } catch {}
    }

    const role = col.role >= 0 ? String(row[col.role] ?? "").trim() : "";
    const salaryHora = col.salHora >= 0 ? parseNumberBR(row[col.salHora]) : 0;
    const salaryMensal = col.salMensal >= 0 ? parseNumberBR(row[col.salMensal]) : 0;
    const idRaw = col.id >= 0 ? row[col.id] : undefined;
    const id = idRaw != null && idRaw !== "" ? String(idRaw).trim() : undefined;

    try {
      // 🔥 AGORA É ASSÍNCRONO
      await employeesStore.add({
        id, name, cpf,
        nascimento: col.nasc >= 0 ? parseAnyDate(row[col.nasc]) : "",
        admission: col.admission >= 0 ? parseAnyDate(row[col.admission]) : "",
        role, cargoFuncao: role,
        site, organograma: site,
        status: col.status >= 0 ? mapStatus(row[col.status]) : "ativo",
        salary: salaryMensal || salaryHora * 220,
        salarioHora: salaryHora,
        department: "Obra", departamento: "Obra",
      });
      created++;
    } catch (err: any) {
      const msg = err?.message ?? "erro";
      if (msg.includes("matrícula") && id) {
        try {
          await employeesStore.add({
            name, cpf,
            nascimento: col.nasc >= 0 ? parseAnyDate(row[col.nasc]) : "",
            admission: col.admission >= 0 ? parseAnyDate(row[col.admission]) : "",
            role, cargoFuncao: role,
            site, organograma: site,
            status: col.status >= 0 ? mapStatus(row[col.status]) : "ativo",
            salary: salaryMensal || salaryHora * 220,
            salarioHora: salaryHora,
            department: "Obra", departamento: "Obra",
          });
          created++;
          continue;
        } catch (err2: any) {
          skipReason(err2?.message ?? "erro ao adicionar");
        }
      } else {
        skipReason(msg);
      }
    }
  }

  const skippedTotal = Object.values(reasons).reduce((a, b) => a + b, 0);
  if (created === 0) {
    const detail = Object.entries(reasons)
      .map(([r, n]) => `${n}× ${r}`).join(" · ") || "sem detalhes";
    console.warn("[import] motivos:", reasons);
    toast.error(`Nenhum funcionário importado. Motivos: ${detail}`);
  } else {
    toast.success(`Importação: ${created} criado(s)${skippedTotal ? `, ${skippedTotal} ignorado(s)` : ""}.`);
    if (skippedTotal) console.warn("[import] motivos:", reasons);
  }
}

function List() {
  const sites = useSites();
  const employees = useEmployees();
  const [q, setQ] = useState("");
  const [site, setSite] = useState<string>("todos");
  const [status, setStatus] = useState<StatusKey>("todos");
  const [sector, setSector] = useState<SectorKey>("todos");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return employees
      .filter((e) => {
        const matchesQ =
          !q ||
          e.name.toLowerCase().includes(q.toLowerCase()) ||
          e.cpf.includes(q) ||
          e.id.includes(q);
        const matchesSite = site === "todos" || e.site === site;
        const matchesStatus = status === "todos" || employeeStatusKey(e) === status;
        const matchesSector = sector === "todos" || employeeSectorKey(e) === sector;
        return matchesQ && matchesSite && matchesStatus && matchesSector;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [employees, q, site, status, sector]);

  return (
    <PageShell
      eyebrow="Quadro de pessoal"
      title="Funcionários"
      description={`${employees.length} colaboradores cadastrados em ${sites.length} canteiros.`}
      actions={
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { 
                // 🔥 AGORA É ASSÍNCRONO
                await importFromFile(f); 
              } catch (err: any) { 
                toast.error("Falha ao importar: " + (err?.message ?? err)); 
              }
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Importar planilha
          </Button>
          <Button variant="outline" onClick={() => exportCSV(filtered)}>
            <Download className="mr-1 h-4 w-4" /> Exportar CSV
          </Button>
          <Button asChild>
            <Link to="/funcionarios/novo">
              <Plus className="mr-1 h-4 w-4" /> Novo
            </Link>
          </Button>
          <Button 
            variant="outline" 
            className="text-destructive" 
            onClick={async () => {
              // 🔥 AGORA É ASSÍNCRONO
              if (!confirm("Apagar TODOS os funcionários? Esta ação não pode ser desfeita!")) return;
              await employeesStore.removeAll();
              toast.success("Todos os funcionários foram apagados.");
            }}
          >
            Apagar todos
          </Button>
        </>
      }
    >
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-md border border-input px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, CPF ou matrícula"
            className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <Select value={site} onValueChange={setSite}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Obra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as obras</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="efetivo">Efetivos</SelectItem>
            <SelectItem value="pj">PJ</SelectItem>
            <SelectItem value="mobilizacao">Mobilização</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sector} onValueChange={(value) => setSector(value as SectorKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            <SelectItem value="operacional">Operacional</SelectItem>
            <SelectItem value="administrativo">Administrativo</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" aria-label="Mais filtros">
          <Filter className="h-4 w-4" />
        </Button>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[80px_1.5fr_1fr_1fr_120px_40px] items-center gap-3 border-b border-border bg-muted/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Matrícula</div>
          <div>Nome / Função</div>
          <div>Obra</div>
          <div>Setor</div>
          <div>Status</div>
          <div />
        </div>
        <ul className="divide-y divide-border">
          {filtered.map((e) => (
            <li key={e.id}>
              <Link
                to="/funcionarios/$id"
                params={{ id: e.id }}
                className="grid grid-cols-[80px_1.5fr_1fr_1fr_120px_40px] items-center gap-3 px-5 py-4 transition hover:bg-muted/50"
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
                <div className="text-sm">{employeeSectorKey(e) === "operacional" ? "Operacional" : "Administrativo"}</div>
                <div><StatusBadge status={e.status} /></div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
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