import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Wallet, Download, Search } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmployees, type Employee } from "@/lib/employees";
import { useSites } from "@/lib/sites-store";
import { payrollStore, usePayroll, currentMonth } from "@/lib/payroll-store";
import { useAuth } from "@/lib/auth-store";
import { isRhObra, getObraIdFromRhObra } from "@/lib/permissions";

export const Route = createFileRoute("/folha-salarial")({
  head: () => ({ meta: [{ title: "Folha Salarial · SIGA" }] }),
  component: FolhaSalarial,
});

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
function monthLabel(m: string): string {
  const [y, mm] = m.split("-");
  return `${MESES_PT[parseInt(mm, 10) - 1]} / ${y}`;
}
function buildMonthOptions(extra: string[]): string[] {
  const set = new Set<string>(extra);
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return Array.from(set).sort().reverse();
}

function FolhaSalarial() {
  const sites = useSites();
  const employees = useEmployees();
  const overrides = usePayroll();
  const auth = useAuth();
  const [q, setQ] = useState("");
  const [month, setMonth] = useState<string>(currentMonth());
  
  const [filterObra, setFilterObra] = useState<string>("__all__");

  // Auto-filter para RH_Obra
  useEffect(() => {
    if (isRhObra(auth.currentUser?.role)) {
      const obraId = getObraIdFromRhObra(auth.currentUser!.role);
      const obra = sites.find(s => s.id === obraId);
      if (obra) {
        setFilterObra(obra.name);
      }
    }
  }, [auth.currentUser?.role, sites]);

  const eligibleEmployees = useMemo(
    () => employees.filter((employee) => {
      const re = String(employee.id ?? "").trim();
      if (!re) return false;
      if (re.toLowerCase().includes("pj")) return false;
      return /^\d+$/.test(re);
    }),
    [employees],
  );

  const monthMap = overrides[month] ?? {};
  const getValue = (e: Employee): number | "" =>
    monthMap[e.id] !== undefined ? monthMap[e.id] : "";
  const getNum = (e: Employee): number => {
    const v = getValue(e);
    return typeof v === "number" ? v : 0;
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Employee[]>();
    sites.forEach((s) => map.set(s.name, []));
    eligibleEmployees.forEach((e) => {
      if (filterObra !== "__all__" && e.site !== filterObra) return;
      if (!map.has(e.site)) map.set(e.site, []);
      const list = map.get(e.site)!;
      if (
        !q ||
        e.name.toLowerCase().includes(q.toLowerCase()) ||
        e.cpf.includes(q) ||
        e.role.toLowerCase().includes(q.toLowerCase())
      ) {
        list.push(e);
      }
    });
    return Array.from(map.entries())
      .filter(([n]) => filterObra === "__all__" || n === filterObra)
      .map(([siteName, list]) => [
        siteName,
        [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
      ] as const);
  }, [sites, eligibleEmployees, q, filterObra]);

  const totalGeral = useMemo(
    () =>
      grouped.reduce(
        (acc, [, list]) => acc + list.reduce((s, e) => {
          const v = getValue(e);
          return s + (typeof v === "number" ? v : 0);
        }, 0),
        0,
      ),
    [grouped, monthMap],
  );

  const monthOptions = buildMonthOptions(Object.keys(overrides));
  const mLabel = monthLabel(month);

  function buildObraPDF(siteName: string, list: Employee[]) {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(16);
    doc.text(`Folha Salarial — ${siteName}`, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Competência: ${mLabel} · Emitido em ${today}`, 14, 21);
    doc.setTextColor(20);
    const subtotal = list.reduce((s, e) => s + getNum(e), 0);
    autoTable(doc, {
      startY: 28,
      head: [["Matrícula", "Nome", "CPF", "Função", "Banco", "Ag.", "Conta", "PIX", "Salário"]],
      body: list.map((e) => [
        e.id, e.name, e.cpf, e.role, e.bank.bank, e.bank.agency,
        `${e.bank.account} (${e.bank.type})`, e.bank.pix, fmtBRL(getNum(e)),
      ]),
      foot: [[
        { content: "Total da obra", colSpan: 8, styles: { halign: "right", fontStyle: "bold" } },
        { content: fmtBRL(subtotal), styles: { fontStyle: "bold" } },
      ]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 27, 61], textColor: 255 },
      footStyles: { fillColor: [230, 235, 245], textColor: 20 },
      margin: { left: 14, right: 14 },
    });
    return doc;
  }

  function exportSite(siteName: string | null) {
    const safeMonth = month;
    if (siteName === null) {
      let count = 0;
      grouped.forEach(([sName, list]) => {
        if (list.length === 0) return;
        const doc = buildObraPDF(sName, list);
        const safe = sName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        doc.save(`folha-${safe}-${safeMonth}.pdf`);
        count++;
      });
      if (count === 0) toast.error("Nenhuma obra com colaboradores.");
      else toast.success(`${count} PDF(s) gerado(s).`);
      return;
    }
    const entry = grouped.find(([n]) => n === siteName);
    if (!entry || entry[1].length === 0) {
      toast.error("Esta obra não tem colaboradores.");
      return;
    }
    const doc = buildObraPDF(entry[0], entry[1]);
    const safe = entry[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    doc.save(`folha-${safe}-${safeMonth}.pdf`);
    toast.success("PDF gerado.");
  }

  return (
    <PageShell
      eyebrow="Pagamentos"
      title="Folha Salarial"
      description="Selecione o mês, lance os valores por obra e exporte em PDF."
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Download className="mr-1 h-4 w-4" /> Exportar PDF
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
            <DropdownMenuLabel>Escolha a obra</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportSite(null)}>Todas as obras</DropdownMenuItem>
            <DropdownMenuSeparator />
            {sites.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => exportSite(s.name)}>
                {s.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-md border border-input px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar funcionário por nome, CPF ou função"
              className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col w-full sm:w-auto">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mês</span>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col w-full sm:w-auto">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Filtrar obra</span>
            <Select value={filterObra} onValueChange={setFilterObra}>
              <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as obras</SelectItem>
                {sites.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>


          <Badge variant="secondary" className="text-sm">
            Total {mLabel}: <span className="ml-2 font-display">{fmtBRL(totalGeral)}</span>
          </Badge>
        </div>
      </Card>

      <div className="space-y-6">
        {grouped.map(([siteName, list]) => {
          const subtotal = list.reduce((s, e) => s + getNum(e), 0);
          return (
            <Card key={siteName} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-3 bg-primary text-primary-foreground">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-accent/20 p-2">
                    <Wallet className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60">Obra</p>
                    <CardTitle className="font-display text-lg">{siteName}</CardTitle>
                  </div>
                </div>
                <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
                  {list.length} colaborador(es)
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {list.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhum funcionário {q ? "encontrado" : "alocado"} nesta obra.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left">Matrícula</th>
                          <th className="px-4 py-3 text-left">Nome / Função</th>
                          <th className="px-4 py-3 text-left">CPF</th>
                          <th className="px-4 py-3 text-left">Banco</th>
                          <th className="px-4 py-3 text-left">Ag. / Conta</th>
                          <th className="px-4 py-3 text-left">PIX</th>
                          <th className="px-4 py-3 text-right">Salário {mLabel}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {list.map((e) => (
                          <tr key={e.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{e.id}</td>
                            <td className="px-4 py-3">
                              <p className="font-semibold">{e.name}</p>
                              <p className="text-xs text-muted-foreground">{e.role}</p>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{e.cpf}</td>
                            <td className="px-4 py-3">{e.bank.bank}</td>
                            <td className="px-4 py-3 font-mono text-xs">
                              {e.bank.agency} / {e.bank.account} <span className="text-muted-foreground">({e.bank.type})</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{e.bank.pix}</td>
                            <td className="px-4 py-3 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={getValue(e)}
                                placeholder="0,00"
                                data-payroll-input
                                onKeyDown={(ev) => {
                                  if (ev.key === "Enter") {
                                    ev.preventDefault();
                                    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-payroll-input]"));
                                    const idx = inputs.indexOf(ev.currentTarget);
                                    const next = inputs[idx + 1];
                                    if (next) { next.focus(); next.select(); }
                                  }
                                }}
                                onChange={(ev) => {
                                  const raw = ev.target.value;
                                  if (raw === "") return;
                                  const v = parseFloat(raw);
                                  payrollStore.set(month, e.id, isNaN(v) ? 0 : v);
                                }}
                                className="ml-auto h-9 w-32 text-right font-semibold"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/50 font-semibold">
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-right uppercase text-xs tracking-wider">
                            Subtotal da obra
                          </td>
                          <td className="px-4 py-3 text-right font-display text-base text-accent">
                            {fmtBRL(subtotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-accent/40 bg-accent/5">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total do mês ({mLabel})</p>
            <p className="font-display text-3xl text-foreground">{fmtBRL(totalGeral)}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg">
                <Download className="mr-1 h-4 w-4" /> Exportar PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
              <DropdownMenuLabel>Escolha a obra</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportSite(null)}>Todas as obras</DropdownMenuItem>
              <DropdownMenuSeparator />
              {sites.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => exportSite(s.name)}>
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    </PageShell>
  );
}
