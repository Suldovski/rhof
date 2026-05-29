import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, HardHat, Calendar, MapPin, User, Users, 
  Trash2, FileText, Search, Upload, Plus 
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect, useRef } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmployees, employeesStore } from "@/lib/employees";
import { importFromFile } from "@/lib/employees-import-fixed";
import { sitesStore, useSites, useSite } from "@/lib/sites-store";
import { authStore, useAuth } from "@/lib/auth-store";
import { isClienteObra, getObraIdFromClienteObra } from "@/lib/permissions";

export const Route = createFileRoute("/obras_/$id")({
  head: () => ({ meta: [{ title: `Obra · Bucagrans RH` }] }),
  component: ObraDetail,
});

function ObraDetail() {
  const { id } = Route.useParams();
  const sites = useSites();
  const employees = useEmployees();
  const navigate = useNavigate();
  const auth = useAuth();
  const [confirmDel, setConfirmDel] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sectorFilter, setSectorFilter] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const isClient = isClienteObra(auth.currentUser?.role);

  // Check permission for cliente_obra
  useEffect(() => {
    if (isClienteObra(auth.currentUser?.role)) {
      const clienteObraId = getObraIdFromClienteObra(auth.currentUser!.role);
      if (id !== clienteObraId) {
        toast.error("Você não tem permissão para acessar esta obra.");
        navigate({ to: "/" });
      }
    }
  }, [auth.currentUser?.role, id, navigate]);

  // Tenta encontrar a obra pelo ID exato ou por slug
  const obra = useMemo(() => {
    if (!sites || sites.length === 0) return null;
    
    // Primeiro tenta ID exato
    let found = sites.find((s) => s.id === id);
    
    // Se não encontrar, tenta por slug do nome
    if (!found && id) {
      found = sites.find((s) => {
        const slug = s.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        return slug === id;
      });
    }
    
    return found || null;
  }, [sites, id]);

  // Loading só sai quando sites carregarem (mesmo que vazio)
  useEffect(() => {
    if (sites !== undefined && sites !== null) {
      setLoading(false);
    }
  }, [sites]);

  const team = useMemo(
    () => (obra ? employees.filter((e) => e.site === obra.name) : []),
    [obra, employees],
  );

  const filtered = useMemo(() => {
    return team.filter((e) => {
      const matchesQ =
        !q ||
        e.name.toLowerCase().includes(q.toLowerCase()) ||
        e.cpf.includes(q) ||
        e.id.includes(q) ||
        e.role.toLowerCase().includes(q.toLowerCase());
      const normalizedStatus = e.status === "admissao" || e.status === "mobilizacao"
        ? "mobilizacao"
        : e.status === "efetivo" || e.status === "ativo"
          ? "efetivo"
          : e.status;
      const matchesStatus = statusFilter === "todos" || normalizedStatus === statusFilter;
      const matchesSector = sectorFilter === "todos"
        || (sectorFilter === "administrativo" ? e.department === "Administrativo" : e.department !== "Administrativo");
      return matchesQ && matchesSector && matchesStatus;
    });
  }, [team, q, statusFilter, sectorFilter]);

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

  if (!obra) {
    return (
      <PageShell title="Obra não encontrada" eyebrow="Canteiro">
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <p>Esta obra não existe ou foi removida.</p>
            <p className="mt-2 text-xs">ID procurado: <code className="bg-muted px-2 py-1 rounded">{id}</code></p>
            <div className="mt-4"><Button asChild><Link to="/obras">Voltar para Obras</Link></Button></div>
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

  return (
    <PageShell
      eyebrow="Canteiro de obras"
      title={obra.name}
      description={obra.description || "Detalhes da obra e equipe alocada."}
      actions={
        <>
          {isClient ? (
            <>
              <Button variant="outline" onClick={handleLogout}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Sair
              </Button>
            </>
          ) : (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                try { await importFromFile(f, obra?.name); } catch (err: any) { toast.error("Falha: " + (err?.message ?? err)); }
                if (fileRef.current) fileRef.current.value = "";
              }} />
              <Button variant="outline" asChild>
                <Link to="/obras"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
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
            const allSites = sites.length > 0 ? sites : sitesStore.list();
            const resolvedObra = useMemo(() => {
              if (obra) return obra;

              const currentClientName = auth.currentUser?.workName || auth.currentUser?.obraNome || "";
              const targetSlug = String(id || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

              return allSites.find((site) => {
                const siteSlug = site.name
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
                return site.id === id || siteSlug === targetSlug || site.name === currentClientName;
              }) ?? null;
            }, [allSites, auth.currentUser?.obraNome, auth.currentUser?.workName, obra, id]);

            useEffect(() => {
              if (isClient && !obra && resolvedObra && resolvedObra.id !== id) {
                navigate({ to: "/obras/$id", params: { id: resolvedObra.id } });
              }
            }, [isClient, obra, resolvedObra, id, navigate]);
                    <Trash2 className="mr-1 h-4 w-4" /> Excluir obra
                  </Button>
                  <Button variant="outline" className="text-destructive" onClick={() => {
                    if (!confirm(`Apagar todos os funcionários de ${obra.name}?`)) return;
                    employeesStore.removeAllFromSite(obra.name);
                    toast.success("Funcionários da obra apagados.");
                  }}>
                    Apagar todos
            const activeObra = obra ?? resolvedObra;

            const team = useMemo(
              () => (activeObra ? employees.filter((e) => e.site === activeObra.name) : []),
              [activeObra, employees],
            );
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
              {obra.status}
            </Badge>
            <h2 className="mt-3 font-display text-xl">{obra.name}</h2>

            <div className="mt-6 space-y-3 text-sm">
              {(() => {
                let startLabel = "—";
                try {
                  const d = new Date(obra.start);
                  if (!isNaN(d.getTime())) startLabel = d.toLocaleDateString("pt-BR");
                } catch (e) {
                  startLabel = "—";
                }
                return <Row icon={Calendar} label={`Início: ${startLabel}`} />;
              })()}
              <Row icon={User} label={`Responsável: ${obra.manager}`} />
              {obra.address && <Row icon={MapPin} label={obra.address} />}
              <Row icon={Users} label={`${team.length} colaborador(es) alocado(s)`} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="font-display text-lg">Equipe alocada</CardTitle>
              <Badge variant="secondary">{filtered.length} / {team.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-md border border-input px-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nome, função, CPF ou matrícula"
                    className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos status</SelectItem>
                    <SelectItem value="efetivo">Efetivos</SelectItem>
                    <SelectItem value="pj">PJ</SelectItem>
                    <SelectItem value="mobilizacao">Mobilização</SelectItem>
                title={activeObra.name}
                description={activeObra.description || "Detalhes da obra e equipe alocada."}
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Setor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos setores</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {team.length === 0 ? "Nenhum colaborador alocado nesta obra." : "Nenhum resultado para os filtros aplicados."}
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <Link
                        to="/funcionarios/$id"
                        params={{ id: p.id }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {p.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-sm">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            #{p.id} · {p.role} · {p.department === "Seguranca" ? "Segurança" : p.department}
                          </p>
                        </div>
                              if (!confirm(`Apagar todos os funcionários de ${activeObra.name}?`)) return;
                              employeesStore.removeAllFromSite(activeObra.name);
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
              {[`Termo de confidencialidade — ${obra.name}.pdf`, `Ficha de registro — ${obra.name}.pdf`].map((d) => (
                <div key={d} className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="flex-1 text-sm">{d}</span>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/documentos">Abrir</Link>
                        {activeObra.status}
                </div>
                      <h2 className="mt-3 font-display text-xl">{activeObra.name}</h2>
            </CardContent>
          </Card>
        </div>
      </div>

                            const d = new Date(activeObra.start);
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {obra.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              sitesStore.remove(obra.id);
              toast.success("Obra excluída.");
              navigate({ to: "/obras" });
            }}>Excluir</AlertDialogAction>
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
