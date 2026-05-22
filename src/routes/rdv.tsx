import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Download, Trash2, Calendar, Receipt, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { rdvStore, useRdvPayments } from "@/lib/rdv-store";

export const Route = createFileRoute("/rdv")({
  head: () => ({ meta: [{ title: "RDV · Bucagrans RH" }] }),
  component: RdvIndex,
});

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function RdvIndex() {
  const payments = useRdvPayments();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState("");

  const sorted = useMemo(
    () => [...payments].sort((a, b) => b.data.localeCompare(a.data)),
    [payments],
  );

  function createPayment() {
    if (!data) {
      toast.error("Informe a data do pagamento.");
      return;
    }
    const p = rdvStore.create(data, descricao);
    toast.success("Dia de pagamento criado.");
    setOpen(false);
    setDescricao("");
    // navega via Link manual
    window.location.href = `/rdv/${p.id}`;
  }

  return (
    <PageShell
      eyebrow="Pagamentos"
      title="RDV — Relatório de Despesas de Viagem"
      description="Organize os reembolsos por dia de pagamento e gere o relatório em PDF."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Novo dia de pagamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo dia de pagamento</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Data</label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição (opcional)</label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Reembolso obra X" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={createPayment}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum dia de pagamento criado. Clique em <strong>Novo dia de pagamento</strong> para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((p) => {
            const total = p.entries.reduce((s, e) => s + (e.valor || 0), 0);
            return (
              <Card key={p.id} className="overflow-hidden transition-colors hover:border-accent/40">
                <Link to="/rdv/$id" params={{ id: p.id }} className="block">
                  <CardHeader className="flex flex-row items-center justify-between gap-3 bg-primary text-primary-foreground">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-accent/20 p-2">
                        <Calendar className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60">Pagamento</p>
                        <CardTitle className="font-display text-lg">{fmtDate(p.data)}</CardTitle>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-primary-foreground/60" />
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{p.descricao || "—"}</p>
                      <p className="mt-1 text-sm">
                        <Badge variant="secondary">{p.entries.length} colaborador(es)</Badge>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</p>
                      <p className="font-display text-lg text-accent">{fmtBRL(total)}</p>
                    </div>
                  </CardContent>
                </Link>
                <div className="flex justify-end gap-2 border-t px-4 py-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            rdvStore.remove(p.id);
                            toast.success("Pagamento excluído.");
                          }}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

// PDF export reutilizado na rota de detalhe
export function buildRdvPDF(
  data: string,
  descricao: string,
  rows: Array<{ id: string; name: string; cpf: string; bank: any; numero: string; valor: number }>,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const today = new Date().toLocaleDateString("pt-BR");
  doc.setFontSize(16);
  doc.text(`RDV — Pagamento ${fmtDate(data)}`, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${descricao ? descricao + " · " : ""}Emitido em ${today}`, 14, 21);
  doc.setTextColor(20);
  const subtotal = rows.reduce((s, r) => s + (r.valor || 0), 0);
  autoTable(doc, {
    startY: 28,
    head: [["Matrícula", "Nome", "CPF", "Banco", "Ag.", "Conta", "PIX", "Nº RDV", "Valor"]],
    body: rows.map((r) => [
      r.id, r.name, r.cpf, r.bank?.bank ?? "", r.bank?.agency ?? "",
      `${r.bank?.account ?? ""}${r.bank?.type ? ` (${r.bank.type})` : ""}`,
      r.bank?.pix ?? "", r.numero || "—", fmtBRL(r.valor || 0),
    ]),
    foot: [[
      { content: "Total", colSpan: 8, styles: { halign: "right", fontStyle: "bold" } },
      { content: fmtBRL(subtotal), styles: { fontStyle: "bold" } },
    ]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 27, 61], textColor: 255 },
    footStyles: { fillColor: [230, 235, 245], textColor: 20 },
    margin: { left: 14, right: 14 },
  });
  return doc;
}

export { fmtDate, fmtBRL };
