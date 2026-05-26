import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, CalendarClock } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { employees } from "@/lib/employees";
import { useAuth } from "@/lib/auth-store";
import { isClienteObra } from "@/lib/permissions";

export const Route = createFileRoute("/funcionarios/ferias")({
  head: () => ({ meta: [{ title: "Funcionários em férias · Bucagrans RH" }] }),
  component: Ferias,
});

function Ferias() {
  const list = employees.filter((e) => e.status === "ferias");
  const auth = useAuth();
  const navigate = useNavigate();

  // Redirect cliente_obra - they can't access employee lists
  useEffect(() => {
    if (isClienteObra(auth.currentUser?.role)) {
      toast.error("Você não tem permissão para acessar funcionários.");
      navigate({ to: "/" });
    }
  }, [auth.currentUser?.role, navigate]);

  return (
    <PageShell
      eyebrow="Quadro de pessoal"
      title="Em férias"
      description={`${list.length} colaborador(es) em período de férias.`}
      actions={
        <Button variant="outline" asChild>
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Painel</Link>
        </Button>
      }
    >
      <Card className="overflow-hidden p-0">
        {list.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-3"><CalendarClock className="h-6 w-6 text-muted-foreground" /></div>
            <p className="text-sm text-muted-foreground">Nenhum colaborador em férias no momento.</p>
          </CardContent>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((e) => (
              <li key={e.id}>
                <Link
                  to="/funcionarios/$id"
                  params={{ id: e.id }}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {e.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.role} · {e.site}</p>
                  </div>
                  <StatusBadge status={e.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}
