import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wallet, Download, Search } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEmployees, type Employee } from "@/lib/employees";
import { useSites } from "@/lib/sites-store";
import { payrollStore, usePayroll } from "@/lib/payroll-store";

export const Route = createFileRoute("/folha-salarial")({
  head: () => ({ meta: [{ title: "Folha Salarial · Bucagrans RH" }] }),
  component: FolhaSalarial,
});

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FolhaSalarial() {
  const sites = useSites();
  const employees = useEmployees();
  const overrides = usePayroll();
  const [q, setQ] = useState("");

  const getValue = (e: Employee) =>
    overrides[e.id] !== undefined ? overrides[e.id] : e.salary;

  const grouped = useMemo(() => {
    const map = new Map<string, Employee[]>();
    sites.forEach((s) => map.set(s.name, []));
    employees.forEach((e) => {
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
    return Array.from(map.entries());
  }, [sites, q]);

  const totalGeral = useMemo(
    () =>
      grouped.reduce(
        (acc, [, list]) => acc + list.reduce((s, e) => s + getValue(e), 0),
        0,
      ),
    [grouped, overrides],
  );

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(16);
    doc.text("Folha Salarial — Bucagrans RH", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Emitido em ${today}`, 14, 21);

    let cursorY = 28;
    let totalPDF = 0;

    grouped.forEach(([siteName, list]) => {
      if (list.length === 0) return;
      const subtotal = list.reduce((s, e) => s + getValue(e), 0);
      totalPDF += subtotal;

      autoTable(doc, {
        startY: cursorY,
        head: [[
          { content: `Obra: ${siteName}`, colSpan: 7, styles: { halign: "left", fillColor: [15, 27, 61], textColor: 255, fontStyle: "bold" } },
        ]],
        body: [],
        theme: "plain",
        margin: { left: 14, right: 14 },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY,
        head: [["Matrícula", "Nome", "Função", "Banco", "Ag.", "Conta", "PIX", "Salário"]],
        body: list.map((e) => [
          e.id,
          e.name,
          e.role,
          e.bank.bank,
          e.bank.agency,
          `${e.bank.account} (${e.bank.type})`,
          e.bank.pix,
          fmtBRL(getValue(e)),
        ]),
        foot: [[
          { content: "Subtotal", colSpan: 7, styles: { halign: "right", fontStyle: "bold" } },
          { content: fmtBRL(subtotal), styles: { fontStyle: "bold" } },
        ]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [230, 235, 245], textColor: 20 },
        footStyles: { fillColor: [245, 247, 250], textColor: 20 },
        margin: { left: 14, right: 14 },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 6;
    });

    autoTable(doc, {
      startY: cursorY + 2,
      body: [[
        { content: "TOTAL GERAL", styles: { halign: "right", fontStyle: "bold", fillColor: [15, 27, 61], textColor: 255 } },
        { content: fmtBRL(totalPDF), styles: { halign: "right", fontStyle: "bold", fillColor: [15, 27, 61], textColor: 255 } },
      ]],
      theme: "plain",
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 230 }, 1: { cellWidth: 40 } },
    });

    doc.save(`folha-salarial-${today.replace(/\//g, "-")}.pdf`);
    toast.success("PDF gerado.");
  }

  function buildObraPDF(siteName: string, list: Employee[]) {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(16);
    doc.text(`Folha Salarial — ${siteName}`, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Bucagrans RH · Emitido em ${today}`, 14, 21);
    doc.setTextColor(20);
    const subtotal = list.reduce((s, e) => s + getValue(e), 0);
    autoTable(doc, {
      startY: 28,
      head: [["Matrícula", "Nome", "Função", "Banco", "Ag.", "Conta", "PIX", "Salário"]],
      body: list.map((e) => [
        e.id, e.name, e.role, e.bank.bank, e.bank.agency,
        `${e.bank.account} (${e.bank.type})`, e.bank.pix, fmtBRL(getValue(e)),
      ]),
      foot: [[
        { content: "Total da obra", colSpan: 7, styles: { halign: "right", fontStyle: "bold" } },
        { content: fmtBRL(subtotal), styles: { fontStyle: "bold" } },
      ]],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 27, 61], textColor: 255 },
      footStyles: { fillColor: [230, 235, 245], textColor: 20 },
      margin: { left: 14, right: 14 },
    });
    return doc;
  }

  function exportPerObra() {
    const today = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    let count = 0;
    grouped.forEach(([siteName, list]) => {
      if (list.length === 0) return;
      const doc = buildObraPDF(siteName, list);
      const safe = siteName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      doc.save(`folha-${safe}-${today}.pdf`);
      count++;
    });
    if (count === 0) toast.error("Nenhuma obra com colaboradores.");
    else toast.success(`${count} PDF(s) gerado(s) — um por obra.`);
  }

  return (
    <PageShell
      eyebrow="Pagamentos"
      title="Folha Salarial"
      description="Lance o valor pago a cada colaborador, agrupado por obra, e exporte em PDF."
      actions={
        <>
          <Button variant="outline" onClick={exportPDF}>
            <Download className="mr-1 h-4 w-4" /> PDF único
          </Button>
          <Button onClick={exportPerObra}>
            <Download className="mr-1 h-4 w-4" /> PDF por obra
          </Button>
        </>
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
          <Badge variant="secondary" className="text-sm">
            Total geral: <span className="ml-2 font-display">{fmtBRL(totalGeral)}</span>
          </Badge>
        </div>
      </Card>

      <div className="space-y-6">
        {grouped.map(([siteName, list]) => {
          const subtotal = list.reduce((s, e) => s + getValue(e), 0);
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
                          <th className="px-4 py-3 text-left">Banco</th>
                          <th className="px-4 py-3 text-left">Ag. / Conta</th>
                          <th className="px-4 py-3 text-left">PIX</th>
                          <th className="px-4 py-3 text-right">Salário (R$)</th>
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
                                onChange={(ev) => {
                                  const v = parseFloat(ev.target.value);
                                  payrollStore.set(e.id, isNaN(v) ? 0 : v);
                                }}
                                className="ml-auto h-9 w-32 text-right font-semibold"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/50 font-semibold">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-right uppercase text-xs tracking-wider">
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
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total geral da folha</p>
            <p className="font-display text-3xl text-foreground">{fmtBRL(totalGeral)}</p>
          </div>
          <Button size="lg" onClick={exportPDF}>
            <Download className="mr-1 h-4 w-4" /> Exportar PDF
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}
