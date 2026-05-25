import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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
import { overtimeStore, useOvertime, type OvertimeEntry } from "@/lib/overtime-store";
import { useEmployees } from "@/lib/employees";

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
  const [creating, setCreating] = useState(false);
  const [periodo, setPeriodo] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = periods.find((p) => p.id === activeId) ?? null;

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
    if (!active) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Horas Extras — ${active.periodo}`, 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, 14, 20);
    doc.setTextColor(20);

    const body = active.entries.map((e) => {
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
    const total = active.entries.reduce((s, e) => s + calcTotal(e), 0);
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
    doc.save(`horas-extras-${active.periodo.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
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

  const totalGeral = useMemo(
    () => active ? active.entries.reduce((s, e) => s + calcTotal(e), 0) : 0,
    [active],
  );

  if (active) {
    return (
      <PageShell
        eyebrow="Folha complementar"
        title={`Horas Extras — ${active.periodo}`}
        description={`${active.entries.length} lançamento(s) · Total ${fmtBRL(totalGeral)}`}
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
            <Button onClick={exportPDF} disabled={active.entries.length === 0}>
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
                {active.entries.map((e, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{e.employeeName}</p>
                      {e.employeeId && <p className="text-xs text-muted-foreground">#{e.employeeId}</p>}
                    </td>
                    <td className="px-3 py-1 text-right">
                      <Input type="number" step="0.01" value={e.horas50 || ""} onChange={(ev) => updateEntry(i, { horas50: parseFloat(ev.target.value) || 0 })} className="h-8 w-24 ml-auto text-right" />
                    </td>
                    <td className="px-3 py-1 text-right">
                      <Input type="number" step="0.01" value={e.horas100 || ""} onChange={(ev) => updateEntry(i, { horas100: parseFloat(ev.target.value) || 0 })} className="h-8 w-24 ml-auto text-right" />
                    </td>
                    <td className="px-3 py-1 text-right">
                      <Input type="number" step="0.01" value={e.noturnas || ""} onChange={(ev) => updateEntry(i, { noturnas: parseFloat(ev.target.value) || 0 })} className="h-8 w-24 ml-auto text-right" />
                    </td>
                    <td className="px-3 py-1 text-right">
                      <Input type="number" step="0.01" value={e.salarioHora || ""} onChange={(ev) => updateEntry(i, { salarioHora: parseFloat(ev.target.value) || 0 })} className="h-8 w-24 ml-auto text-right" />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtBRL(calcTotal(e))}</td>
                    <td className="px-2"><Button size="icon" variant="ghost" onClick={() => removeEntry(i)}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
                {active.entries.length === 0 && (
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
        <Button onClick={() => { setPeriodo(""); setCreating(true); }}>
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
          <div className="grid gap-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Identificação do período</Label>
            <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Ex: Novembro/2025" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!periodo.trim()) { toast.error("Informe o período."); return; }
              const p = overtimeStore.add(periodo.trim());
              setCreating(false);
              setActiveId(p.id);
            }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
