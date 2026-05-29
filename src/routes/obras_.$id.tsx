import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  FileText,
  HardHat,
  MapPin,
  Plus,
  Search,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmployees, employeesStore } from "@/lib/employees";
import { importFromFile } from "@/lib/employees-import-fixed";
import { sitesStore, useSites } from "@/lib/sites-store";
import { authStore, useAuth } from "@/lib/auth-store";
import { getObraIdFromClienteObra, isClienteObra } from "@/lib/permissions";

export const Route = createFileRoute("/obras_/$id")({
  head: () => ({ meta: [{ title: "Obra · SIGA" }] }),
  component: ObraDetail,
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ObraDetail() {
  const { id } = Route.useParams();
  const sites = useSites();
  const employees = useEmployees();
  const navigate = useNavigate();
  const auth = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sectorFilter, setSectorFilter] = useState("todos");
  const [loading, setLoading] = useState(true);

  const isClient = isClienteObra(auth.currentUser?.role);

  useEffect(() => {
    if (isClienteObra(auth.currentUser?.role)) {
      const clienteObraId = getObraIdFromClienteObra(auth.currentUser!.role);
      if (id !== clienteObraId) {
        toast.error("Você não tem permissão para acessar esta obra.");
        navigate({ to: "/" });
      }
    }
  }, [auth.currentUser?.role, id, navigate]);

  const obra = useMemo(() => {
    if (!sites || sites.length === 0) return null;

    let found = sites.find((site) => site.id === id);

    if (!found && id) {
      found = sites.find((site) => slugify(site.name) === slugify(id));
    }

    return found ?? null;
  }, [sites, id]);

  const allSites = sites.length > 0 ? sites : sitesStore.list();

  const resolvedObra = useMemo(() => {
    if (obra) return obra;

    const currentClientName = auth.currentUser?.workName || auth.currentUser?.obraNome || "";
    const targetSlug = slugify(String(id || ""));

    return (
      allSites.find((site) => {
        const siteSlug = slugify(site.name);
        return site.id === id || siteSlug === targetSlug || site.name === currentClientName;
      }) ?? null
    );
  }, [allSites, auth.currentUser?.obraNome, auth.currentUser?.workName, id, obra]);

  useEffect(() => {
    if (isClient && !obra && resolvedObra && resolvedObra.id !== id) {
      navigate({ to: "/obras/$id", params: { id: resolvedObra.id } });
    }
  }, [isClient, obra, resolvedObra, id, navigate]);

  useEffect(() => {
    if (sites !== undefined && sites !== null) {
      setLoading(false);
    }
  }, [sites]);

  const activeObra = obra ?? resolvedObra;

  const team = useMemo(() => {
    if (!activeObra) return [];

    return employees
      .filter((employee) => employee.site === activeObra.name)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [activeObra, employees]);

  const filtered = useMemo(() => {
    return team.filter((employee) => {
      const matchesQuery =
        !q ||
        employee.name.toLowerCase().includes(q.toLowerCase()) ||
        employee.cpf.includes(q) ||
        employee.id.includes(q) ||
        employee.role.toLowerCase().includes(q.toLowerCase());

      const normalizedStatus =
        employee.status === "admissao" || employee.status === "mobilizacao"
          ? "mobilizacao"
          : employee.status === "efetivo" || employee.status === "ativo"
            ? "efetivo"
            : employee.status;

      const matchesStatus = statusFilter === "todos" || normalizedStatus === statusFilter;
      const matchesSector =
        sectorFilter === "todos" ||
        (sectorFilter === "administrativo"
          ? employee.department === "Administrativo"
          : employee.department !== "Administrativo");

      return matchesQuery && matchesStatus && matchesSector;
    });
  }, [q, sectorFilter, statusFilter, team]);

  if (loading) {
    return (
      <PageShell title="Carregando..." eyebrow="Canteiro">
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Carregando dados da obra...
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (!activeObra) {
    return (
      <PageShell title="Obra não encontrada" eyebrow="Canteiro">
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <p>Esta obra não existe ou foi removida.</p>
            <p className="mt-2 text-xs">
              ID procurado: <code className="rounded bg-muted px-2 py-1">{id}</code>
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link to="/obras">Voltar para Obras</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const canManageWorks = !isClienteObra(auth.currentUser?.role);

  const handleLogout = async () => {
    await authStore.logout();
    navigate({ to: "/login", search: { redirect: "/" } });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importFromFile(file, activeObra.name);
    } catch (error: any) {
      toast.error("Falha: " + (error?.message ?? error));
    }

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  return (
    <PageShell
      eyebrow="Canteiro de obras"
      title={activeObra.name}
      description={activeObra.description || "Detalhes da obra e equipe alocada."}
      actions={
        <>
          {isClient ? (
            <Button variant="outline" onClick={handleLogout}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Sair
            </Button>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImport}
              />
              <Button variant="outline" asChild>
                <Link to="/obras">
                  <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                </Link>
              </Button>
              {canManageWorks && (
                <>
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-1 h-4 w-4" /> Importar planilha
                  </Button>
                  <Button asChild>
                    <Link to="/funcionarios/novo">
                      <Plus className="mr-1 h-4 w-4" /> Novo
                    </Link>
                  </Button>
                  <Button variant="destructive" onClick={() => setConfirmDel(true)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Excluir obra
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      if (!confirm(`Apagar todos os funcionários de ${activeObra.name}?`)) return;
                      employeesStore.removeAllFromSite(activeObra.name);
                      toast.success("Funcionários da obra apagados.");
                    }}
                  >
                    Apagar todos
                  </Button>
                </>
              )}
            </>
          )}
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-accent/15">
              <HardHat className="h-7 w-7 text-accent" />
            </div>
            <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
              {activeObra.status}
            </Badge>
            <h2 className="mt-3 font-display text-xl">{activeObra.name}</h2>

            <div className="mt-6 space-y-3 text-sm">
              <Row
                icon={Calendar}
                label={`Início: ${(() => {
                  try {
                    const startDate = new Date(activeObra.start);
                    return isNaN(startDate.getTime())
                      ? "—"
                      : startDate.toLocaleDateString("pt-BR");
                  } catch {
                    return "—";
                  }
                })()}`}
              />
              <Row icon={User} label={`Responsável: ${activeObra.manager}`} />
              {activeObra.address && <Row icon={MapPin} label={activeObra.address} />}
              <Row icon={Users} label={`${team.length} colaborador(es) alocado(s)`} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="font-display text-lg">Equipe alocada</CardTitle>
              <Badge variant="secondary">
                {filtered.length} / {team.length}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-md border border-input px-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Buscar por nome, função, CPF ou matrícula"
                    className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos status</SelectItem>
                    <SelectItem value="efetivo">Efetivos</SelectItem>
                    <SelectItem value="pj">PJ</SelectItem>
                    <SelectItem value="mobilizacao">Mobilização</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos setores</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {team.length === 0
                    ? "Nenhum colaborador alocado nesta obra."
                    : "Nenhum resultado para os filtros aplicados."}
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {filtered.map((employee) => (
                    <li key={employee.id}>
                      <Link
                        to="/funcionarios/$id"
                        params={{ id: employee.id }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {employee.name
                            .split(" ")
                            .slice(0, 2)
                            .map((name) => name[0])
                            .join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{employee.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            #{employee.id} · {employee.role} · {employee.department === "Seguranca" ? "Segurança" : employee.department}
                          </p>
                        </div>
                        <StatusBadge status={employee.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Documentos da obra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[`Termo de confidencialidade — ${activeObra.name}.pdf`, `Ficha de registro — ${activeObra.name}.pdf`].map((documentName) => (
                <div key={documentName} className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="flex-1 text-sm">{documentName}</span>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/documentos">Abrir</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {activeObra.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                sitesStore.remove(activeObra.id);
                toast.success("Obra excluída.");
                navigate({ to: "/obras" });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function Row({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-foreground">{label}</span>
    </div>
  );
}
