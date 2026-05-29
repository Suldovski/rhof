import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Download, Plus, Trash2, Search, Receipt } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { collection, getDocs } from "firebase/firestore";
import { useEmployees } from "@/lib/employees";
import { isRhObra, isWorkUser, getUserWorkId, getObraIdFromRhObra } from "@/lib/permissions";
import { db } from "@/lib/firebase";
import { rdvStore, useRdvPayment } from "@/lib/rdv-store";
import { useSites } from "@/lib/sites-store";
import { buildRdvPDF, fmtDate, fmtBRL } from "./rdv";
import { useAuth } from "@/lib/auth-store";
import { useRouteProtection, roleChecks } from "@/lib/route-protection";

export const Route = createFileRoute("/rdv_/$id")({
  head: () => ({ meta: [{ title: "RDV · SIGA" }] }),
  component: RdvDetail,
});

function RdvDetail() {
  const { id } = Route.useParams();
  const payment = useRdvPayment(id);
  const employees = useEmployees();
  const sites = useSites();
  const auth = useAuth();
  const navigate = useNavigate();
  useRouteProtection(roleChecks.rdv, "RDV");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [workers, setWorkers] = useState<Array<{ id: string; name: string; cpf?: string; role?: string; obraId?: string; workId?: string; site?: string; organograma?: string; salary?: number; salarioHora?: number }>>([]);

  const userObraId = useMemo(() => {
    if (isRhObra(auth.currentUser?.role)) return getObraIdFromRhObra(auth.currentUser!.role);
    if (isWorkUser(auth.currentUser)) return getUserWorkId(auth.currentUser as any);
    return null;
  }, [auth.currentUser?.role, auth.currentUser?.workId, auth.currentUser?.obraId]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkers() {
      try {
        const [workersSnap, funcionariosSnap] = await Promise.allSettled([
          getDocs(collection(db, "workers")),
          getDocs(collection(db, "funcionarios")),
        ]);

        const docs = [workersSnap, funcionariosSnap].flatMap((result) =>
          result.status === "fulfilled" ? result.value.docs : [],
        );

        const nextWorkers = docs
          .map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
              id: doc.id,
              name: String(data.name ?? data.nome ?? data.fullName ?? data.displayName ?? "").trim(),
              cpf: typeof data.cpf === "string" ? data.cpf.trim() : "",
              role: typeof data.role === "string" ? data.role.trim() : "",
              salary: typeof data.salary === "number" ? data.salary : undefined,
              salarioHora: typeof data.salarioHora === "number" ? data.salarioHora : undefined,
              obraId: typeof data.obraId === "string" ? data.obraId.trim() : "",
              workId: typeof data.workId === "string" ? data.workId.trim() : "",
              site: typeof data.site === "string" ? data.site.trim() : "",
              organograma: typeof data.organograma === "string" ? data.organograma.trim() : "",
            };
          })
          .filter((worker) => worker.id && worker.name);

        if (!cancelled) setWorkers(nextWorkers);
      } catch {
        if (!cancelled) setWorkers([]);
      }
    }

    void loadWorkers();

    return () => {
      cancelled = true;
    };
  }, []);

  const combinedWorkers = useMemo(() => {
    const localWorkers = employees.map((emp) => {
      const siteMatch = sites.find((s) => s.name === (emp.site || emp.organograma));
      const obraId = siteMatch ? siteMatch.id : "";
      return {
        id: emp.id,
        name: emp.name,
        cpf: emp.cpf,
        role: emp.role || emp.cargoFuncao,
        salary: emp.salary,
        salarioHora: emp.salarioHora,
        obraId,
        workId: obraId,
        site: emp.site,
        organograma: emp.organograma,
      };
    });

    const merged = [...workers];
    for (const worker of localWorkers) {
      if (!merged.find((current) => current.id === worker.id)) merged.push(worker as any);
    }
    return merged;
  }, [employees, workers, sites]);

  const activeObraId = useMemo(() => {
    if (payment?.obraId) return payment.obraId;
    if (!payment) return null;
    const byName = sites.find((site) => site.name === payment.descricao);
    return byName?.id ?? null;
  }, [payment, sites]);

  const activeObraName = useMemo(() => {
    if (payment?.obraNome) return payment.obraNome;
    if (activeObraId) return sites.find((site) => site.id === activeObraId)?.name ?? payment?.descricao ?? "";
    return payment?.descricao ?? "";
  }, [payment, activeObraId, sites]);

  const availableEmployees = useMemo(() => {
    const used = new Set(payment?.entries.map((e) => e.employeeId) ?? []);
    const filteredByObra = combinedWorkers.filter((worker) => {
      const workerObraId = worker.workId || worker.obraId || "";
      if (userObraId) return workerObraId === userObraId;
      if (!activeObraId) return true;
      return workerObraId === activeObraId;
    });

    return filteredByObra
      .filter((e) => !used.has(e.id))
      .filter((e) =>
        !q ||
        e.name.toLowerCase().includes(q.toLowerCase()) ||
        e.cpf.includes(q) ||
        e.id.includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payment, q, combinedWorkers, activeObraId, userObraId]);

  if (!payment) {
    return (
      <PageShell eyebrow="RDV" title="Pagamento não encontrado">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <p>Este dia de pagamento não existe ou foi removido.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/rdv"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const rows = payment.entries.map((entry) => {
    const emp = employees.find((e) => e.id === entry.employeeId);
    return { entry, emp };
  });

  const total = payment.entries.reduce((s, e) => s + (e.valor || 0), 0);

  function togglePick(eid: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(eid)) next.delete(eid); else next.add(eid);
      return next;
    });
  }

  function toggleAllVisible() {
    const allIds = availableEmployees.map((e) => e.id);
    const allSelected = allIds.every((i) => picked.has(i));
    setPicked((prev) => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach((i) => next.delete(i));
      else allIds.forEach((i) => next.add(i));
      return next;
    });
  }

  function confirmAdd() {
    if (!activeObraId) {
      toast.error("Selecione uma obra primeiro");
      return;
    }
    if (picked.size === 0) {
      toast.error("Selecione ao menos um funcionário.");
      return;
    }
    rdvStore.addEmployees(payment!.id, Array.from(picked));
    toast.success(`${picked.size} funcionário(s) adicionado(s).`);
    setPicked(new Set());
    setQ("");
    setPickerOpen(false);
  }

  function exportPDF() {
    if (rows.length === 0) {
      toast.error("Adicione funcionários antes de exportar.");
      return;
    }
    const pdfRows = rows.map(({ entry, emp }) => ({
      id: emp?.id ?? entry.employeeId,
      name: emp?.name ?? "—",
      cpf: emp?.cpf ?? "—",
      bank: emp?.bank ?? {},
      numero: entry.numero,
      valor: entry.valor,
    }));
    const doc = buildRdvPDF(payment!.data, payment!.descricao, pdfRows);
    doc.save(`rdv-${payment!.data}.pdf`);
    toast.success("PDF gerado.");
  }

  return (
    <PageShell
      eyebrow="RDV"
      title={`Pagamento ${fmtDate(payment.data)}`}
      description={payment.descricao || "Selecione funcionários, lance valores e exporte o relatório."}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/rdv"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
          <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" disabled={!activeObraId} title={!activeObraId ? "Selecione uma obra primeiro" : undefined}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar funcionários
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Selecionar funcionários{activeObraName ? ` — ${activeObraName}` : ""}</DialogTitle>
              </DialogHeader>
              {!activeObraId && (
                <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  Selecione uma obra primeiro
                </p>
              )}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-md border border-input px-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nome, CPF ou matrícula"
                    className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={availableEmployees.length > 0 && availableEmployees.every((e) => picked.has(e.id))}
                    onCheckedChange={toggleAllVisible}
                    disabled={!activeObraId}
                  />
                  Selecionar todos visíveis
                </label>
                <Badge variant="secondary">{picked.size} selecionado(s)</Badge>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                {!activeObraId ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Selecione uma obra primeiro
                  </p>
                ) : availableEmployees.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum colaborador encontrado para esta obra
                  </p>
                ) : (
                  <ul className="divide-y">
                    {availableEmployees.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 py-2">
                        <Checkbox
                          checked={picked.has(e.id)}
                          onCheckedChange={() => togglePick(e.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{e.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            #{e.id}{e.cpf ? ` · ${e.cpf}` : ""}{e.role ? ` · ${e.role}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPickerOpen(false)}>Cancelar</Button>
                <Button onClick={confirmAdd}>Adicionar {picked.size > 0 ? `(${picked.size})` : ""}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={exportPDF}><Download className="mr-1 h-4 w-4" /> Exportar PDF</Button>
        </div>
      }
    >
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhum funcionário adicionado. Clique em <strong>Adicionar funcionários</strong>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-left">Matrícula</th>
                    <th className="px-3 py-3 text-left">Nome</th>
                    <th className="px-3 py-3 text-left">CPF</th>
                    <th className="px-3 py-3 text-left">Banco</th>
                    <th className="px-3 py-3 text-left">Ag. / Conta</th>
                    <th className="px-3 py-3 text-left">PIX</th>
                    <th className="px-3 py-3 text-left">Nº RDV</th>
                    <th className="px-3 py-3 text-right">Valor</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(({ entry, emp }) => (
                    <tr key={entry.employeeId} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">#{entry.employeeId}</td>
                      <td className="px-3 py-2 font-semibold">{emp?.name ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{emp?.cpf ?? "—"}</td>
                      <td className="px-3 py-2">{emp?.bank.bank ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {emp ? `${emp.bank.agency} / ${emp.bank.account} (${emp.bank.type})` : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{emp?.bank.pix ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Input
                          value={entry.numero}
                          onChange={(e) =>
                            rdvStore.updateEntry(payment.id, entry.employeeId, { numero: e.target.value })
                          }
                          placeholder="—"
                          className="h-9 w-32"
                          data-rdv-input
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") {
                              ev.preventDefault();
                              const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-rdv-input]"));
                              const idx = inputs.indexOf(ev.currentTarget);
                              const next = inputs[idx + 1];
                              if (next) { next.focus(); next.select(); }
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={entry.valor || ""}
                          placeholder="0,00"
                          data-rdv-input
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") {
                              ev.preventDefault();
                              const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-rdv-input]"));
                              const idx = inputs.indexOf(ev.currentTarget);
                              const next = inputs[idx + 1];
                              if (next) { next.focus(); next.select(); }
                            }
                          }}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            rdvStore.updateEntry(payment.id, entry.employeeId, { valor: isNaN(v) ? 0 : v });
                          }}
                          className="ml-auto h-9 w-32 text-right font-semibold"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover funcionário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {emp?.name ?? entry.employeeId} será removido deste pagamento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => rdvStore.removeEmployee(payment.id, entry.employeeId)}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50 font-semibold">
                  <tr>
                    <td colSpan={7} className="px-3 py-3 text-right uppercase text-xs tracking-wider">Total</td>
                    <td className="px-3 py-3 text-right font-display text-base text-accent">{fmtBRL(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
