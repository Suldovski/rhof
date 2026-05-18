import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, HardHat,
  ShieldCheck, Pencil, FileText, Download, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { employeesStore, useEmployee } from "@/lib/employees";
import { downloadFRE } from "@/lib/fre-pdf";

export const Route = createFileRoute("/funcionarios/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Funcionário #${params.id} · Bucagrans RH` }],
  }),
  notFoundComponent: () => (
    <div className="p-12 text-center">
      <p className="text-sm text-muted-foreground">Funcionário não encontrado.</p>
      <Button asChild className="mt-4"><Link to="/funcionarios">Voltar</Link></Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-sm text-destructive">{error.message}</div>
  ),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const e = useEmployee(id);
  const navigate = useNavigate();
  const [confirmDel, setConfirmDel] = useState(false);
  if (!e) {
    return (
      <PageShell title="Funcionário não encontrado" eyebrow="Quadro">
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Este funcionário não existe ou foi removido.
          <div className="mt-4"><Button asChild><Link to="/funcionarios">Voltar</Link></Button></div>
        </CardContent></Card>
      </PageShell>
    );
  }
  const initials = e.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("");

  return (
    <PageShell
      eyebrow={`Matrícula #${e.id}`}
      title={e.name}
      description={`${e.role} · ${e.site}`}
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/funcionarios"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
          <Button variant="outline" onClick={() => { downloadFRE(e); toast.success("FRE exportada."); }}>
            <Download className="mr-1 h-4 w-4" /> Exportar FRE
          </Button>
          <Button><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {initials}
            </div>
            <h2 className="mt-4 font-display text-xl">{e.name}</h2>
            <p className="text-sm text-muted-foreground">{e.role}</p>
            <div className="mt-3 flex justify-center"><StatusBadge status={e.status} /></div>

            <div className="mt-6 space-y-3 text-left text-sm">
              <Row icon={Mail} label={e.email} />
              <Row icon={Phone} label={e.phone} />
              <Row icon={MapPin} label={e.address} />
              <Row icon={Calendar} label={`Admitido em ${new Date(e.admission).toLocaleDateString("pt-BR")}`} />
              <Row icon={HardHat} label={e.site} />
            </div>
          </CardContent>
        </Card>

        <div>
          <Tabs defaultValue="dados">
            <TabsList>
              <TabsTrigger value="dados">Dados pessoais</TabsTrigger>
              <TabsTrigger value="contrato">Contrato</TabsTrigger>
              <TabsTrigger value="nrs">NRs & EPIs</TabsTrigger>
              <TabsTrigger value="docs">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg">Identificação</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field label="CPF" value={e.cpf} />
                  <Field label="RG" value={e.rg} />
                  <Field label="CTPS" value={e.ctps} />
                  <Field label="PIS" value={e.pis} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contrato" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg">Vínculo & remuneração</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field label="Cargo" value={e.role} icon={Briefcase} />
                  <Field label="Departamento" value={e.department === "Seguranca" ? "Segurança" : e.department} />
                  <Field label="Obra alocada" value={e.site} />
                  <Field label="Admissão" value={new Date(e.admission).toLocaleDateString("pt-BR")} />
                  <Field
                    label="Salário base"
                    value={e.salary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  />
                  <Field label="Regime" value="CLT — Mensalista" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nrs" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-display text-lg">Certificações de segurança</CardTitle>
                  <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                    <ShieldCheck className="mr-1 h-3 w-3" /> Em dia
                  </Badge>
                </CardHeader>
                <CardContent>
                  {e.certifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma NR registrada.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {e.certifications.map((c: string) => (
                        <Badge key={c} variant="secondary" className="gap-1.5 px-3 py-1.5">
                          <ShieldCheck className="h-3 w-3 text-accent" />
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg">Documentos anexados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(!e.documentos || e.documentos.length === 0) ? (
                    <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
                  ) : e.documentos.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                      <FileText className="h-4 w-4 text-accent" />
                      <span className="flex-1 text-sm">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{(d.size / 1024).toFixed(0)} KB</span>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={d.data} download={d.name} target="_blank" rel="noopener noreferrer">Abrir</a>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageShell>
  );
}

function Row({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm font-medium">
        {Icon && <Icon className="h-4 w-4 text-accent" />}
        {value}
      </p>
    </div>
  );
}
