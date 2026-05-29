import { createFileRoute, Link } from "@tanstack/react-router";
import { UserMinus, Check, X, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dismissalsStore, useDismissals } from "@/lib/dismissals-store";
import { employeesStore } from "@/lib/employees";
import { useAuth } from "@/lib/auth-store";
import { isRhMatriz, isRhObra, getUserWorkName } from "@/lib/permissions";

export const Route = createFileRoute("/admin/demissoes")({
  head: () => ({ meta: [{ title: "Demissões · SIGA" }] }),
  component: AdminDemissoes,
});

function AdminDemissoes() {
  const auth = useAuth();
  const items = useDismissals();
  const currentUser = auth.currentUser;

  // Filter dismissals based on user role
  const filteredItems = items.filter((d) => {
    if (isRhMatriz(currentUser?.role)) return true; // RH Matriz sees all
    if (isRhObra(currentUser?.role)) {
      // RH Obra should only see resolved history for their own obra
      const workName = getUserWorkName(currentUser as any);
      return (!!workName && d.site === workName && d.status !== "pendente");
    }
    return false;
  });

  const pending = filteredItems.filter((d) => d.status === "pendente");
  const resolved = filteredItems.filter((d) => d.status !== "pendente");

  // Only RH Matriz can approve
  const canApprove = isRhMatriz(currentUser?.role);

  const approve = (id: string, empId: string, name: string) => {
    if (!canApprove) {
      toast.error("Apenas RH Matriz pode aprovar demissões.");
      return;
    }
    employeesStore.update(empId, { status: "desligado" });
    employeesStore.remove(empId);
    dismissalsStore.resolve(id, "aprovada");
    toast.success(`${name} desligado(a) e removido(a) do quadro.`);
  };

  const refuse = (id: string) => {
    if (!canApprove) {
      toast.error("Apenas RH Matriz pode recusar demissões.");
      return;
    }
    dismissalsStore.resolve(id, "recusada");
    toast.success("Solicitação recusada.");
  };

  if (!canApprove && !isRhObra(currentUser?.role)) {
    return (
      <PageShell eyebrow="RH" title="Demissões" description="Gerenciamento de demissões">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar esta página.{" "}
            <Link to="/" className="underline">Voltar</Link>.
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={isRhMatriz(currentUser?.role) ? "RH Matriz" : "RH Obra"}
      title="Solicitações de demissão"
      description={`${pending.length} pendente(s) para análise.`}
      actions={
        <Button variant="outline" asChild>
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Painel</Link>
        </Button>
      }
    >
      <h2 className="mb-3 font-display text-lg">Pendentes</h2>
      <div className="grid gap-3 mb-8">
        {pending.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma solicitação pendente.</CardContent></Card>
        )}
        {pending.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="rounded-md bg-destructive/10 p-2"><UserMinus className="h-5 w-5 text-destructive" /></div>
                <div className="min-w-0">
                  <p className="font-semibold">{d.employeeName} <span className="font-mono text-xs text-muted-foreground">#{d.employeeId}</span></p>
                  <p className="text-xs text-muted-foreground">{d.site} · solicitado por {d.requestedBy} em {new Date(d.createdAt).toLocaleDateString("pt-BR")}</p>
                  <p className="mt-2 text-sm">{d.reason}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {canApprove && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => refuse(d.id)}><X className="mr-1 h-4 w-4" /> Recusar</Button>
                    <Button size="sm" variant="destructive" onClick={() => approve(d.id, d.employeeId, d.employeeName)}><Check className="mr-1 h-4 w-4" /> Aprovar e excluir</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 font-display text-lg">Histórico</h2>
      <div className="grid gap-2">
        {resolved.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma resolução ainda.</p>}
        {resolved.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <Badge variant="outline" className={d.status === "aprovada" ? "border-success/40 text-success" : "border-muted-foreground/30 text-muted-foreground"}>
                {d.status}
              </Badge>
              <span className="font-medium">{d.employeeName}</span>
              <span className="text-xs text-muted-foreground">#{d.employeeId} · {d.reason}</span>
              <span className="ml-auto text-xs text-muted-foreground">{d.resolvedAt ? new Date(d.resolvedAt).toLocaleDateString("pt-BR") : ""}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
