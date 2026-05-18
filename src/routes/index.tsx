import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  HardHat,
  TrendingUp,
  ArrowUpRight,
  CalendarClock,
  AlertTriangle,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { useEmployees } from "@/lib/employees";
import { useSites } from "@/lib/sites-store";
import { getGreetingByHour } from "@/lib/greeting";
import { getUserName } from "@/lib/user";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel · Bucagrans RH" },
      { name: "description", content: "Visão geral do RH da construtora — funcionários e obras." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const employees = useEmployees();
  const sites = useSites();
  const title = `${getGreetingByHour()}, ${getUserName()}!`;
  const ativos = employees.filter((e) => e.status === "ativo").length;

  type Kpi = {
    label: string;
    value: number;
    hint: string;
    icon: typeof Users;
    tone: string;
    to: "/funcionarios" | "/obras" | "/funcionarios/ferias";
  };
  const kpis: Kpi[] = [
    {
      label: "Funcionários ativos",
      value: ativos,
      hint: "ver lista completa",
      icon: Users,
      tone: "text-accent",
      to: "/funcionarios",
    },
    {
      label: "Obras em andamento",
      value: sites.length,
      hint: "gerenciar canteiros",
      icon: HardHat,
      tone: "text-primary",
      to: "/obras",
    },
    {
      label: "Em férias",
      value: ferias,
      hint: "ver colaboradores",
      icon: CalendarClock,
      tone: "text-success",
      to: "/funcionarios/ferias",
    },
  ];

  const recentes = [...employees].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).slice(0, 5);
  const orderedSites = [...sites].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <PageShell
      eyebrow="Painel geral"
      title={title}
      description="Acompanhe os indicadores de pessoal e movimentações nos canteiros."
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/funcionarios">Ver funcionários</Link>
          </Button>
          <Button asChild>
            <Link to="/funcionarios/novo">
              <Plus className="mr-1 h-4 w-4" /> Novo cadastro
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((k) => (
          <Link
            key={k.label}
            to={k.to}
            className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Card className="border-l-4 border-l-accent shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </p>
                  <p className="mt-2 font-display text-4xl">{k.value}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground transition group-hover:text-accent">
                    {k.hint} <ArrowUpRight className="h-3 w-3" />
                  </p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <k.icon className={`h-5 w-5 ${k.tone}`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">Funcionários recentes</CardTitle>
              <p className="text-xs text-muted-foreground">Últimos cadastros e movimentações</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/funcionarios">
                Ver todos <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y divide-border">
              {recentes.map((e) => (
                <li key={e.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {e.name
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/funcionarios/$id"
                      params={{ id: e.id }}
                      className="block truncate font-semibold hover:text-accent"
                    >
                      {e.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.role} · {e.site}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Distribuição por obra</CardTitle>
            <p className="text-xs text-muted-foreground">Pessoal alocado por canteiro</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderedSites.map((s) => {
              const count = employees.filter((e) => e.site === s.name).length;
              const pct = employees.length ? (count / employees.length) * 100 : 0;
              return (
                <div key={s.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <Link
                      to="/obras/$id"
                      params={{ id: s.id }}
                      className="font-medium hover:text-accent"
                    >
                      {s.name}
                    </Link>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <div className="rounded-md bg-warning/20 p-2">
              <ShieldCheck className="h-5 w-5 text-warning-foreground" />
            </div>
            <div>
             copilot/convert-to-spa-github-pages-again
              <p className="font-semibold">Entrega de EPIs pendente</p>
              <p className="text-xs text-muted-foreground">
                5 colaboradores no Edifício Atlântico.
              </p>
=======
              <p className="text-xs text-muted-foreground">5 colaboradores no Edifício Atlântico.</p>
   main
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <div className="rounded-md bg-accent/15 p-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
            </div>
            <div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
