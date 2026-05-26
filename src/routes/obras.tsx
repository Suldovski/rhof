import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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
import { employees } from "@/lib/employees";
import { sitesStore, useSites, type Site } from "@/lib/sites-store";
import { useAuth } from "@/lib/auth-store";
import { isClienteObra, getObraIdFromClienteObra } from "@/lib/permissions";

export const Route = createFileRoute("/obras")({
  head: () => ({ meta: [{ title: "Obras · Bucagrans RH" }] }),
  component: Obras,
});

const statusOptions = ["Planejamento", "Fundação", "Estrutura", "Acabamento", "Em execução", "Operação", "Concluída"];

function Obras() {
  const sites = useSites();
  const auth = useAuth();
  const [editing, setEditing] = useState<Site | null>(null);
  const [creating, setCreating] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  // Filter sites for cliente_obra - only show their specific obra
  const displaySites = useMemo(() => {
    if (isClienteObra(auth.currentUser?.role)) {
      const clienteObraId = getObraIdFromClienteObra(auth.currentUser!.role);
      return sites.filter(s => s.id === clienteObraId);
    }
    return sites;
  }, [sites, auth.currentUser?.role]);

  // Check if user can manage works (create, edit, delete)
  const canManageWorks = auth.currentUser?.role === "RH_MATRIZ" || auth.currentUser?.role === "ADMINISTRATIVO_MATRIZ";

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
                <Link to="/obras/$id" params={{ id: s.id }} className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="rounded-md bg-accent/20 p-2">
                    <HardHat className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60">Obra</p>
                    <h3 className="truncate font-display text-lg">{s.name}</h3>
                  </div>
                </Link>
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
                      {new Date(s.start).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Responsável</p>
                    <p className="mt-1 truncate text-sm font-medium">{s.manager}</p>
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
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/obras/$id" params={{ id: s.id }}>
                        Abrir <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
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
            onSubmit={(data) => {
              sitesStore.add(data);
              toast.success("Obra cadastrada.");
              setCreating(false);
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
