import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { HardHat, Users, Calendar, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/lib/employees";
import { sitesStore, useSites, type Site } from "@/lib/sites-store";
import { criarObra } from "@/lib/obras";
import { useAuth } from "@/lib/auth-store";
import { isClienteObra, getObraIdFromClienteObra, isRhObra, isWorkUser, getUserWorkId } from "@/lib/permissions";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/obras")({
  head: () => ({ meta: [{ title: "Obras · Bucagrans RH" }] }),
  component: Obras,
});

const statusOptions = ["Planejamento", "Fundação", "Estrutura", "Acabamento", "Em execução", "Operação", "Concluída"];

type CardDetails = {
  startDate: string | null;
  responsibleName: string | null;
};

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isLikelyId(value: string): boolean {
  return /^[A-Za-z0-9_-]{6,}$/.test(value) && !value.includes(" ");
}

function toDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function formatDate(value: unknown): string | null {
  const date = toDateValue(value);
  return date ? date.toLocaleDateString("pt-BR") : null;
}

function pickName(data: Record<string, unknown>): string {
  return trimText(data.name ?? data.nome ?? data.fullName ?? data.displayName ?? data.responsibleName ?? data.responsavel ?? data.manager);
}

function buildNameLookup(docs: Array<{ id: string; data: () => Record<string, unknown> }>) {
  const lookup = new Map<string, string>();

  docs.forEach((doc) => {
    const data = doc.data();
    const name = pickName(data);
    if (!name) return;

    [doc.id, data.id, data.uid, data.re].forEach((key) => {
      const normalized = trimText(key);
      if (normalized) lookup.set(normalized, name);
    });
  });

  return lookup;
}

function resolveResponsibleName(rawValue: unknown, lookup: Map<string, string>): string | null {
  const value = trimText(rawValue);
  if (!value) return null;

  const resolved = lookup.get(value);
  if (resolved) return resolved;

  if (isLikelyId(value)) return null;

  return value;
}

function Obras() {
  const sites = useSites();
  const auth = useAuth();
  const employees = useEmployees();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Site | null>(null);
  const [creating, setCreating] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<Record<string, CardDetails>>({});

  // Filter sites for obra users (cliente or rh de obra) - only show their specific obra
  const displaySites = useMemo(() => {
    const role = auth.currentUser?.role;
    // cliente_obra: extract id from role
    if (isClienteObra(role)) {
      const clienteObraId = getObraIdFromClienteObra(role!);
      return sites.filter((s) => s.id === clienteObraId);
    }

    // rh_obra or generic work user: use workId/obraId from the user record
    if (isRhObra(auth.currentUser) || isWorkUser(auth.currentUser)) {
      const workId = getUserWorkId(auth.currentUser as any);
      if (workId) return sites.filter((s) => s.id === workId);
      return [];
    }

    // matriz and others see all
    return sites;
  }, [sites, auth.currentUser?.role, auth.currentUser?.workId, auth.currentUser?.obraId]);

  // Check if user can manage works (create, edit, delete)
  // Allow all users EXCEPT cliente_obra
  const canManageWorks = !isClienteObra(auth.currentUser?.role);

  useEffect(() => {
    let cancelled = false;

    async function loadCardDetails() {
      try {
        const [obrasSnap, worksSnap, usersSnap, funcionariosSnap] = await Promise.allSettled([
          getDocs(collection(db, "obras")),
          getDocs(collection(db, "works")),
          getDocs(collection(db, "usuarios")),
          getDocs(collection(db, "funcionarios")),
        ]);

        const obraDocs = [obrasSnap, worksSnap].flatMap((result) => (result.status === "fulfilled" ? result.value.docs : []));
        const userDocs = usersSnap.status === "fulfilled" ? usersSnap.value.docs : [];
        const funcionarioDocs = funcionariosSnap.status === "fulfilled" ? funcionariosSnap.value.docs : [];

        const responsibleLookup = new Map([
          ...buildNameLookup(userDocs).entries(),
          ...buildNameLookup(funcionarioDocs).entries(),
        ]);

        const nextDetails: Record<string, CardDetails> = {};

        obraDocs.forEach((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const startDate = formatDate(
            data.startDate ?? data.dataInicio ?? data.start ?? data.inicio ?? data.data,
          );
          const responsibleName = resolveResponsibleName(
            data.responsibleName ?? data.responsavel ?? data.manager ?? data.responsibleId ?? data.managerId ?? data.responsavelId,
            responsibleLookup,
          );

          nextDetails[doc.id] = {
            startDate,
            responsibleName,
          };
        });

        if (!cancelled) {
          setCardDetails(nextDetails);
        }
      } catch (error) {
        if (!cancelled) {
          setCardDetails({});
        }
      }
    }

    void loadCardDetails();

    return () => {
      cancelled = true;
    };
  }, [sites]);

  return (
    <PageShell
      eyebrow="Canteiros"
      title="Obras ativas"
      description={isClienteObra(auth.currentUser?.role) ? "Acompanhe sua obra." : "Cadastre, edite e acompanhe as equipes alocadas por canteiro."}
      actions={
        canManageWorks ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nova obra
          </Button>
        ) : null
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {displaySites.map((s) => {
          const team = employees.filter((e) => e.site === s.name);
          return (
            <Card key={s.id} className="overflow-hidden">
              <div className="flex items-center justify-between bg-primary px-5 py-4 text-primary-foreground">
                <button type="button" onClick={() => navigate({ to: "/obras/$id", params: { id: s.id } })} className="flex flex-1 items-center gap-3 min-w-0 text-left">
                  <div className="rounded-md bg-accent/20 p-2">
                    <HardHat className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60">Obra</p>
                    <h3 className="truncate font-display text-lg">{s.name}</h3>
                  </div>
                </button>
                <Badge variant="outline" className="ml-2 border-accent/40 bg-accent/10 text-accent">
                  {s.status}
                </Badge>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equipe</p>
                    <p className="mt-1 flex items-center gap-1 font-display text-xl">
                      <Users className="h-4 w-4 text-accent" />{team.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Início</p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-accent" />
                      {cardDetails[s.id]?.startDate ?? formatDate(s.start) ?? "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Responsável</p>
                    <p className="mt-1 truncate text-sm font-medium">
                      {cardDetails[s.id]?.responsibleName ?? (trimText(s.manager) || "Não informado")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex -space-x-2">
                    {team.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        title={p.name}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-semibold text-secondary-foreground"
                      >
                        {p.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                      </div>
                    ))}
                    {team.length > 5 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold">
                        +{team.length - 5}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {canManageWorks && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRemoveId(s.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/obras/$id", params: { id: s.id } })}>
                      Abrir <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {displaySites.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              {isClienteObra(auth.currentUser?.role) ? "Obra não encontrada." : 'Nenhuma obra cadastrada. Clique em "Nova obra" para começar.'}
            </CardContent>
          </Card>
        )}
      </div>

      {canManageWorks && (
        <>
          <SiteFormDialog
            open={creating}
            onOpenChange={setCreating}
            onSubmit={async (data) => {
              // adiciona localmente para mostrar imediatamente na UI e gerar o slug id
              const id = sitesStore.add(data);
              try {
                // cria no Firestore usando o mesmo id para garantir que o cargo dinâmico
                // (rh_obra_<id>) seja gerado com a mesma chave
                await criarObra(data.name, id);
                toast.success("Obra cadastrada.");
              } catch (err) {
                // se falhar no backend, ainda mantemos a obra localmente
                console.error("Erro criando obra no Firestore:", err);
                toast.error("Obra cadastrada localmente, falha ao persistir no servidor.");
              }
              setCreating(false);
              // redireciona automaticamente para a página da obra criada
              try {
                navigate({ to: "/obras/$id", params: { id } });
              } catch (e) {
                // ignore navigation errors
              }
            }}
          />
          <SiteFormDialog
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
            initial={editing ?? undefined}
            onSubmit={(data) => {
              if (editing) {
                sitesStore.update(editing.id, data);
                toast.success("Obra atualizada.");
              }
              setEditing(null);
            }}
          />

          <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir obra?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A obra será removida do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (removeId) {
                    sitesStore.remove(removeId);
                    toast.success("Obra excluída.");
                  }
                  setRemoveId(null);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </>
      )}
    </PageShell>
  );
}

function SiteFormDialog({
  open, onOpenChange, initial, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Site;
  onSubmit: (data: Omit<Site, "id">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [status, setStatus] = useState(initial?.status ?? "Planejamento");
  const [start, setStart] = useState(initial?.start ?? "");
  const [manager, setManager] = useState(initial?.manager ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  // reset when dialog reopens with different initial
  const key = `${open}-${initial?.id ?? "new"}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useStateReset(key, () => {
    setName(initial?.name ?? "");
    setStatus(initial?.status ?? "Planejamento");
    setStart(initial?.start ?? "");
    setManager(initial?.manager ?? "");
    setAddress(initial?.address ?? "");
    setDescription(initial?.description ?? "");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{initial ? "Editar obra" : "Nova obra"}</DialogTitle>
          <DialogDescription>Informações do canteiro de obras.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !start || !manager.trim()) {
              toast.error("Preencha nome, início e responsável.");
              return;
            }
            onSubmit({ name: name.trim(), status, start, manager: manager.trim(), address: address.trim(), description: description.trim() });
          }}
        >
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome da obra *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Início *</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Responsável *</Label>
            <Input value={manager} onChange={(e) => setManager(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Endereço</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{initial ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function useStateReset(key: string, fn: () => void) {
  const last = useRef(key);
  useEffect(() => {
    if (last.current !== key) {
      last.current = key;
      fn();
    }
  }, [key, fn]);
}
