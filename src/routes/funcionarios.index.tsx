import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Filter, Download, ChevronRight } from "lucide-react";
import { toast } from "sonner";
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
import { useEmployees, type Employee } from "@/lib/employees";
import { useSites } from "@/lib/sites-store";

export const Route = createFileRoute("/funcionarios/")({
  head: () => ({
    meta: [{ title: "Funcionários · Bucagrans RH" }],
  }),
  component: List,
});

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
      e.bank.bank, e.bank.agency, e.bank.account, e.bank.type, e.bank.pix,
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

function List() {
  const sites = useSites();
  const employees = useEmployees();
  const [q, setQ] = useState("");
  const [site, setSite] = useState<string>("todos");
  const [dept, setDept] = useState<string>("todos");

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesQ =
        !q ||
        e.name.toLowerCase().includes(q.toLowerCase()) ||
        e.cpf.includes(q) ||
        e.id.includes(q);
      const matchesSite = site === "todos" || e.site === site;
      const matchesDept = dept === "todos" || e.department === dept;
      return matchesQ && matchesSite && matchesDept;
    });
  }, [employees, q, site, dept]);

  return (
    <PageShell
      eyebrow="Quadro de pessoal"
      title="Funcionários"
      description={`${employees.length} colaboradores cadastrados em ${sites.length} canteiros.`}
      actions={
        <>
          <Button variant="outline" onClick={() => exportCSV(filtered)}>
            <Download className="mr-1 h-4 w-4" /> Exportar CSV
          </Button>
          <Button asChild>
            <Link to="/funcionarios/novo">
              <Plus className="mr-1 h-4 w-4" /> Novo
            </Link>
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
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos depts.</SelectItem>
            <SelectItem value="Obra">Obra</SelectItem>
            <SelectItem value="Engenharia">Engenharia</SelectItem>
            <SelectItem value="Seguranca">Segurança</SelectItem>
            <SelectItem value="Administrativo">Administrativo</SelectItem>
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
          <div>Departamento</div>
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
                <div className="text-sm">{e.department === "Seguranca" ? "Segurança" : e.department}</div>
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
