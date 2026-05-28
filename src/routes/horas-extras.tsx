import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, Download, Clock, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { overtimeStore, useOvertime, type OvertimeEntry } from "@/lib/overtime-store";
import { useEmployees } from "@/lib/employees";
import { useAuth } from "@/lib/auth-store";
import { useSites } from "@/lib/sites-store";
import { isRhObra, getObraIdFromRhObra, isMatrizProfile } from "@/lib/permissions";
import { useRouteProtection, roleChecks } from "@/lib/route-protection";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/horas-extras")({
  head: () => ({ meta: [{ title: "Horas Extras · Bucagrans RH" }] }),
  component: HorasExtras,
});

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type WorkerOption = {
  id: string;
  name: string;
  cpf?: string;
  role?: string;
  salary?: number;
  salarioHora?: number;
  obraId?: string;
  workId?: string;
  site?: string;
  organograma?: string;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWorker(doc: { id: string; data: () => Record<string, unknown> }): WorkerOption {
  const data = doc.data();
  return {
    id: doc.id,
    name: normalizeText(data.name ?? data.nome ?? data.fullName ?? data.displayName),
    cpf: normalizeText(data.cpf),
    role: normalizeText(data.role ?? data.cargoFuncao ?? data.cargo),
    salary: typeof data.salary === "number" ? data.salary : undefined,
    salarioHora: typeof data.salarioHora === "number" ? data.salarioHora : undefined,
    obraId: normalizeText(data.obraId),
    workId: normalizeText(data.workId),
    site: normalizeText(data.site),
    organograma: normalizeText(data.organograma),
  };
}

function pickWorkerObraId(worker: WorkerOption): string {
  return worker.workId || worker.obraId || "";
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
  const sites = useSites();
  const auth = useAuth();
  useRouteProtection(roleChecks.horasExtras, "Horas Extras");
  const [creating, setCreating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [newObraId, setNewObraId] = useState<string>("");
  const [filterObra, setFilterObra] = useState<string>("todas");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pickerQ, setPickerQ] = useState("");
  const [pickerSite, setPickerSite] = useState<string>("todas");
  const [firestoreWorkers, setFirestoreWorkers] = useState<WorkerOption[]>([]);

  const userObraId = useMemo(() => {
    if (isRhObra(auth.currentUser?.role)) {
      return getObraIdFromRhObra(auth.currentUser!.role);
    }
    return null;
  }, [auth.currentUser?.role]);

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
          .map((doc) => normalizeWorker(doc))
          .filter((worker) => worker.id && worker.name);

        if (!cancelled) {
          setFirestoreWorkers(nextWorkers);
        }
      } catch {
        if (!cancelled) {
          setFirestoreWorkers([]);
        }
      }
    }

    void loadWorkers();

    return () => {
      cancelled = true;
    };
  }, []);

  // Restringe filtro / criação automaticamente para RH de obra
  useEffect(() => {
    if (userObraId) {
      setFilterObra(userObraId);
      setNewObraId(userObraId);
    }
  }, [userObraId]);

  const visiblePeriods = useMemo(() => {
    let list = periods;
    if (userObraId) list = list.filter((p) => p.obraId === userObraId);
    else if (filterObra !== "todas") list = list.filter((p) => p.obraId === filterObra);
    return list;
  }, [periods, userObraId, filterObra]);

  const active = periods.find((p) => p.id === activeId) ?? null;

  const activeObraId = useMemo(() => {
    if (!active) return null;
    if (active.obraId) return active.obraId;
    if (active.obraNome) {
      return sites.find((site) => site.name === active.obraNome)?.id ?? null;
    }
    return null;
  }, [active, sites]);

  useEffect(() => {
    if (active) {
      setPickerSite(active.obraNome || "todas");
    } else {
      setPickerSite("todas");
    }
  }, [active]);

  const obraName = (id?: string) => sites.find((s) => s.id === id)?.name || "";

  // Funcionários disponíveis para adicionar ao período: filtrados pela obra do período
  const availableEmployees = useMemo(() => {
    if (!active) return [];
    const used = new Set(active.entries.map((e) => e.employeeId));
    // Combine Firestore workers with local employees as a fallback/augmentation.
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
      } as WorkerOption;
    });

    const combined = [...firestoreWorkers];
    for (const lw of localWorkers) {
      if (!combined.find((c) => c.id === lw.id)) combined.push(lw);
    }

    const matchedWorkers = combined.filter((worker) => {
      const workerObraId = pickWorkerObraId(worker);
      return !activeObraId || workerObraId === activeObraId;
    });

    return matchedWorkers
      .filter((e) => !used.has(e.id))
      .filter((e) => pickerSite === "todas" || e.site === pickerSite || e.organograma === pickerSite)
      .filter((e) =>
        !pickerQ ||
        e.name.toLowerCase().includes(pickerQ.toLowerCase()) ||
        e.cpf?.includes(pickerQ) ||
        e.id.includes(pickerQ),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [active, activeObraId, firestoreWorkers, pickerQ, pickerSite]);

  function togglePick(eid: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(eid)) next.delete(eid); else next.add(eid);
      return next;
    });
  }

  function toggleAllVisible() {
    const ids = availableEmployees.map((e) => e.id);
    const allSelected = ids.every((i) => picked.has(i));
    setPicked((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((i) => next.delete(i));
      else ids.forEach((i) => next.add(i));
      return next;
    });
  }

  function confirmAdd() {
    if (!active) return;
    if (picked.size === 0) {
      toast.error("Selecione ao menos um funcionário.");
      return;
    }
    const list = availableEmployees.filter((e) => picked.has(e.id));
    overtimeStore.addEmployees(active.id, list);
    toast.success(`${list.length} funcionário(s) adicionado(s).`);
    setPicked(new Set());
    setPickerQ("");
    setPickerOpen(false);
  }

  const exportPDF = () => {
    if (!active) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Horas Extras — ${active.periodo}`, 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(
      `${active.obraNome ? active.obraNome + " · " : ""}Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
      14, 20,
    );
    doc.setTextColor(20);

    const body = active.entries.map((e) => {
      const emp = employees.find((x) => x.id === e.employeeId);
      return [
        e.employeeName,
        emp?.cpf || "—",
        emp?.bank?.bank || "—",
        emp?.bank?.agency || "—",
        emp?.bank?.account || "—",
        emp?.bank?.type || "—",
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
    () => (active ? active.entries.reduce((s, e) => s + calcTotal(e), 0) : 0),
    [active],
  );

  if (active) {
    return (
      <PageShell
        eyebrow={`Folha complementar${active.obraNome ? " · " + active.obraNome : ""}`}
        title={`Horas Extras — ${active.periodo}`}
        description={`${active.entries.length} lançamento(s) · Total ${fmtBRL(totalGeral)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setActiveId(null)}>Voltar</Button>
            <Dialog open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (!o) { setPicked(new Set()); setPickerQ(""); } }}>
              <DialogTrigger asChild>
                <Button variant="secondary"><UserPlus className="mr-1 h-4 w-4" /> Adicionar funcionários</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Selecionar funcionários{active.obraNome ? ` — ${active.obraNome}` : ""}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Filtrar por obra</Label>
                    <Select value={pickerSite} onValueChange={setPickerSite}>
                      <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as obras</SelectItem>
                        {sites.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-input px-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={pickerQ}
                      onChange={(e) => setPickerQ(e.target.value)}
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
                    />
                    Selecionar todos visíveis
                  </label>
                  <Badge variant="secondary">{picked.size} selecionado(s)</Badge>
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  {combined.filter((worker) => !activeObraId || pickWorkerObraId(worker) === activeObraId).length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum colaborador encontrado para esta obra
                    </p>
                  ) : availableEmployees.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum colaborador disponível para a busca atual.
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
                    Clique em <strong>Adicionar funcionários</strong> para começar.
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
      description="Crie períodos por obra, adicione funcionários, calcule e exporte o relatório."
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
      {/* Filtro por obra (apenas para perfis matriz) */}
      {isMatrizProfile(auth.currentUser?.role) && sites.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Filtrar por obra</Label>
          <Select value={filterObra} onValueChange={setFilterObra}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as obras</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visiblePeriods.map((p) => {
          const total = p.entries.reduce((s, e) => s + calcTotal(e), 0);
          return (
            <Card key={p.id} className="cursor-pointer transition hover:border-accent" onClick={() => setActiveId(p.id)}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="font-display text-base">{p.periodo}</CardTitle>
                  {p.obraNome && <Badge variant="outline" className="mt-1">{p.obraNome}</Badge>}
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
        {visiblePeriods.length === 0 && (
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
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Obra</Label>
              <Select value={newObraId} onValueChange={setNewObraId} disabled={!!userObraId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma obra" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!selectedMonth || !selectedYear) { toast.error("Selecione mês e ano."); return; }
              if (!newObraId) { toast.error("Selecione uma obra."); return; }
              const monthNames = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
              const periodo = `${monthNames[parseInt(selectedMonth)]}/${selectedYear}`;
              const site = sites.find((s) => s.id === newObraId);
              const p = overtimeStore.add(periodo, site ? { id: site.id, nome: site.name } : undefined);
              setCreating(false);
              setActiveId(p.id);
            }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
