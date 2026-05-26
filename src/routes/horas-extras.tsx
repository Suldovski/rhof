import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { Plus, Upload, Trash2, Download, Clock } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { overtimeStore, useOvertime, type OvertimeEntry } from "@/lib/overtime-store";
import { useEmployees } from "@/lib/employees";
import { useAuth } from "@/lib/auth-store";
import { isRhObra, getObraIdFromRhObra } from "@/lib/permissions";

export const Route = createFileRoute("/horas-extras")({
  head: () => ({ meta: [{ title: "Horas Extras · Bucagrans RH" }] }),
  component: HorasExtras,
});

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function parseNumberBR(v: any): number {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  const s = String(v).replace(/[hH\s]/g, "").replace(",", ".");
  // Suporta HH:MM
  if (s.includes(":")) {
    const [h, m] = s.split(":").map((x) => parseInt(x, 10) || 0);
    return h + m / 60;
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function normKey(s: any): string {
  return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findCol(headers: string[], terms: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (terms.some((t) => headers[i] === t || headers[i].includes(t))) return i;
  }
  return -1;
}

function calcTotal(e: OvertimeEntry): number {
  return (
    e.horas50 * e.salarioHora * 1.5 +
    e.horas100 * e.salarioHora * 2 +
    e.noturnas * e.salarioHora * 1.2
  );
}

function HorasExtras() {
  const periods = useOvertime();
  const employees = useEmployees();
  const auth = useAuth();
  const [creating, setCreating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Get user's obra for filtering
  const userObraId = useMemo(() => {
    if (isRhObra(auth.currentUser?.role)) {
      return getObraIdFromRhObra(auth.currentUser!.role);
    }
    return null;
  }, [auth.currentUser?.role]);

  // Filter employees for RH_Obra
  const filteredEmployees = useMemo(() => {
    if (!userObraId) return employees;
    return employees.filter(e => {
      // Try to match by organograma (obra) field or site field
      return e.organograma === userObraId || e.site === userObraId;
    });
  }, [employees, userObraId]);

  const active = periods.find((p) => p.id === activeId) ?? null;

  // Filter entries for display if RH_Obra
  const activeWithFilteredEntries = useMemo(() => {
    if (!active || !userObraId) return active;
    return {
      ...active,
      entries: active.entries.filter(e => {
        const emp = employees.find(x => x.id === e.employeeId);
        return !emp || emp.organograma === userObraId || emp.site === userObraId;
      }),
    };
  }, [active, userObraId, employees]);

  const handleImport = async (file: File) => {
    if (!active) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rows.length < 2) { toast.error("Planilha vazia."); return; }

    let headerIdx = -1, best = 0;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const keys = rows[i].map(normKey);
      const score =
        (keys.some((k) => k.includes("nome") || k.includes("funcionario")) ? 2 : 0) +
        (keys.some((k) => k.includes("he") || k.includes("hora") || k === "50" || k === "100") ? 2 : 0);
      if (score > best) { best = score; headerIdx = i; }
    }
    if (headerIdx < 0) { toast.error("Cabeçalho não encontrado."); return; }
    const headers = rows[headerIdx].map(normKey);
    const col = {
      nome: findCol(headers, ["nome", "funcionario", "colaborador"]),
      matricula: findCol(headers, ["matricula", "re", "codigo"]),
      h50: findCol(headers, ["he50", "horaextra50", "extra50", "h50", "cinquenta"]),
      h100: findCol(headers, ["he100", "horaextra100", "extra100", "h100", "cem"]),
      noturna: findCol(headers, ["noturn", "adnoturno"]),
    };
    if (col.nome < 0) { toast.error("Coluna NOME não encontrada."); return; }

    const entries: OvertimeEntry[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => c === "" || c == null)) continue;
      const nome = String(row[col.nome] ?? "").trim();
      if (!nome) continue;
      const matricula = col.matricula >= 0 ? String(row[col.matricula] ?? "").trim() : "";
      const emp = employees.find(
        (e) => (matricula && e.id === matricula) ||
          e.name.toLowerCase().trim() === nome.toLowerCase(),
      );
      entries.push({
        employeeId: emp?.id ?? "",
        employeeName: emp?.name ?? nome,
        horas50: col.h50 >= 0 ? parseNumberBR(row[col.h50]) : 0,
        horas100: col.h100 >= 0 ? parseNumberBR(row[col.h100]) : 0,
        noturnas: col.noturna >= 0 ? parseNumberBR(row[col.noturna]) : 0,
        salarioHora: emp?.salarioHora || (emp?.salary ? emp.salary / 220 : 0),
      });
    }
    overtimeStore.update(active.id, { entries });
    toast.success(`${entries.length} lançamentos importados.`);
  };

  const exportPDF = () => {
    const displayActive = activeWithFilteredEntries || active;
    if (!displayActive) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Horas Extras — ${displayActive.periodo}`, 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, 14, 20);
    doc.setTextColor(20);

    const body = displayActive.entries.map((e) => {
      const emp = employees.find((x) => x.id === e.employeeId);
      return [
        e.employeeName,
        emp?.cpf || "—",
        emp?.bank.bank || "—",
        emp?.bank.agency || "—",
        emp?.bank.account || "—",
        emp?.bank.type || "—",
        e.horas50.toFixed(2),
        e.horas100.toFixed(2),
        e.noturnas.toFixed(2),
        fmtBRL(e.salarioHora),
        fmtBRL(calcTotal(e)),
      ];
    });
    const total = displayActive.entries.reduce((s, e) => s + calcTotal(e), 0);
    autoTable(doc, {
      startY: 26,
      head: [["Nome", "CPF", "Banco", "Ag.", "Conta", "Tp", "HE 50%", "HE 100%", "Not.", "Sal./h", "Total"]],
      body,
      foot: [["", "", "", "", "", "", "", "", "", "TOTAL", fmtBRL(total)]],
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 27, 61], textColor: 255 },
      footStyles: { fillColor: [240, 244, 250], textColor: 20, fontStyle: "bold" },
      margin: { left: 14, right: 14 },
    });
    doc.save(`horas-extras-${displayActive.periodo.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
  };

  const updateEntry = (idx: number, patch: Partial<OvertimeEntry>) => {
    if (!active) return;
    const entries = active.entries.map((e, i) => i === idx ? { ...e, ...patch } : e);
    overtimeStore.update(active.id, { entries });
  };

  const removeEntry = (idx: number) => {
    if (!active) return;
    overtimeStore.update(active.id, {
      entries: active.entries.filter((_, i) => i !== idx),
    });
  };

  const totalGeral = useMemo(() => {
    const displayActive = activeWithFilteredEntries || active;
    return displayActive ? displayActive.entries.reduce((s, e) => s + calcTotal(e), 0) : 0;
  }, [activeWithFilteredEntries, active]);

  if (active) {
    const displayActive = activeWithFilteredEntries || active;
    return (
      <PageShell
        eyebrow="Folha complementar"
        title={`Horas Extras — ${active.periodo}`}
        description={`${displayActive.entries.length} lançamento(s) · Total ${fmtBRL(totalGeral)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setActiveId(null)}>Voltar</Button>
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); if (fileRef.current) fileRef.current.value = ""; }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> Importar Ponto Secullum
            </Button>
            <Button onClick={exportPDF} disabled={displayActive.entries.length === 0}>
              <Download className="mr-1 h-4 w-4" /> Exportar PDF
            </Button>
          </>
        }
      >
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Funcionário</th>
                  <th className="px-3 py-2 text-right">HE 50%</th>
                  <th className="px-3 py-2 text-right">HE 100%</th>
                  <th className="px-3 py-2 text-right">Noturna</th>
                  <th className="px-3 py-2 text-right">Sal./h</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayActive.entries.map((e, i) => {
                  const activeIdx = active.entries.findIndex(x => x === e);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <p className="font-medium">{e.employeeName}</p>
                        {e.employeeId && <p className="text-xs text-muted-foreground">#{e.employeeId}</p>}
                      </td>
                      <td className="px-3 py-1 text-right">
                        <Input type="number" step="0.01" value={e.horas50 || ""} onChange={(ev) => updateEntry(activeIdx, { horas50: parseFloat(ev.target.value) || 0 })} className="h-8 w-24 ml-auto text-right" />
                      </td>
                      <td className="px-3 py-1 text-right">
                        <Input type="number" step="0.01" value={e.horas100 || ""} onChange={(ev) => updateEntry(activeIdx, { horas100: parseFloat(ev.target.value) || 0 })} className="h-8 w-24 ml-auto text-right" />
                      </td>
                      <td className="px-3 py-1 text-right">
                        <Input type="number" step="0.01" value={e.noturnas || ""} onChange={(ev) => updateEntry(activeIdx, { noturnas: parseFloat(ev.target.value) || 0 })} className="h-8 w-24 ml-auto text-right" />
                      </td>
                      <td className="px-3 py-1 text-right">
                        <Input type="number" step="0.01" value={e.salarioHora || ""} onChange={(ev) => updateEntry(activeIdx, { salarioHora: parseFloat(ev.target.value) || 0 })} className="h-8 w-24 ml-auto text-right" />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtBRL(calcTotal(e))}</td>
                      <td className="px-2"><Button size="icon" variant="ghost" onClick={() => removeEntry(activeIdx)}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  );
                })}
                {displayActive.entries.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    Importe a planilha do Ponto Secullum para preencher os lançamentos.
                  </td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Folha complementar"
      title="Horas Extras"
      description="Importe horas do Ponto Secullum, calcule e exporte o relatório para pagamento."
      actions={
        <Button onClick={() => { 
          const now = new Date();
          setSelectedMonth(String(now.getMonth() + 1).padStart(2, "0"));
          setSelectedYear(String(now.getFullYear()));
          setCreating(true); 
        }}>
          <Plus className="mr-1 h-4 w-4" /> Novo período
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {periods.map((p) => {
          const total = p.entries.reduce((s, e) => s + calcTotal(e), 0);
          return (
            <Card key={p.id} className="cursor-pointer transition hover:border-accent" onClick={() => setActiveId(p.id)}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="font-display text-base">{p.periodo}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <Clock className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-display">{fmtBRL(total)}</p>
                <p className="text-xs text-muted-foreground">{p.entries.length} lançamento(s)</p>
                <Button size="sm" variant="ghost" className="mt-2 text-destructive" onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Excluir este período?")) overtimeStore.remove(p.id);
                }}>Excluir</Button>
              </CardContent>
            </Card>
          );
        })}
        {periods.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Nenhum período criado. Clique em "Novo período" para começar.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Novo período</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">Janeiro</SelectItem>
                    <SelectItem value="02">Fevereiro</SelectItem>
                    <SelectItem value="03">Março</SelectItem>
                    <SelectItem value="04">Abril</SelectItem>
                    <SelectItem value="05">Maio</SelectItem>
                    <SelectItem value="06">Junho</SelectItem>
                    <SelectItem value="07">Julho</SelectItem>
                    <SelectItem value="08">Agosto</SelectItem>
                    <SelectItem value="09">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((year) => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!selectedMonth || !selectedYear) { toast.error("Selecione mês e ano."); return; }
              const monthNames = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
              const periodo = `${monthNames[parseInt(selectedMonth)]}/${selectedYear}`;
              const p = overtimeStore.add(periodo);
              setCreating(false);
              setActiveId(p.id);
            }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
