import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSites } from "@/lib/sites-store";

export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [{ title: "Documentos · Bucagrans RH" }] }),
  component: Documentos,
});

function Documentos() {
  const sites = useSites();
  const [selected, setSelected] = useState<string>(sites[0]?.id ?? "");
  const obra = sites.find((s) => s.id === selected);

  return (
    <PageShell
      eyebrow="Modelos"
      title="Documentos"
      description="Modelos prontos para cadastro e formalização de colaboradores por obra."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Ficha de registro</CardTitle>
            <p className="text-xs text-muted-foreground">Modelo padrão para admissão de colaboradores.</p>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent/10">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Ficha de Registro.pdf</p>
              <p className="text-xs text-muted-foreground">PDF · 120 KB</p>
            </div>
            <Button onClick={() => toast.success("Download iniciado.")}>
              <Download className="mr-1 h-4 w-4" /> Baixar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Termo de confidencialidade</CardTitle>
            <p className="text-xs text-muted-foreground">Cada obra possui um termo específico — selecione o canteiro.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Obra
              </label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder="Selecione uma obra" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 rounded-md border border-border p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent/10">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  Termo de Confidencialidade — {obra?.name ?? "Selecione"}
                </p>
                <p className="text-xs text-muted-foreground">PDF · específico do canteiro</p>
              </div>
              <Button
                disabled={!obra}
                onClick={() => toast.success(`Download: Termo — ${obra?.name}`)}
              >
                <Download className="mr-1 h-4 w-4" /> Baixar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
