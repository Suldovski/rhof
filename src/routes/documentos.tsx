import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSites } from "@/lib/sites-store";
import {
  docTemplatesStore, useDocTemplates, readFileAsDataURL, type DocTemplate,
} from "@/lib/doc-templates-store";

export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [{ title: "Documentos · Bucagrans RH" }] }),
  component: Documentos,
});

function Documentos() {
  const sites = useSites();
  const templates = useDocTemplates();
  const [selected, setSelected] = useState<string>(sites[0]?.id ?? "");
  const [category, setCategory] = useState<DocTemplate["category"]>("termo");
  const obra = sites.find((s) => s.id === selected);

  const termosObra = templates.filter((t) => t.category === "termo" && t.obraId === selected);
  const outros = templates.filter((t) => t.category !== "termo");

  async function onUpload(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede 10 MB.`);
        continue;
      }
      const data = await readFileAsDataURL(file);
      docTemplatesStore.add({
        name: file.name.replace(/\.[^.]+$/, ""),
        category,
        filename: file.name,
        mime: file.type,
        size: file.size,
        data,
        obraId: category === "termo" ? selected : undefined,
      });
    }
    toast.success("Modelo(s) importado(s).");
  }

  return (
    <PageShell
      eyebrow="Modelos"
      title="Documentos"
      description="Importe modelos de documentos da empresa. Termos de confidencialidade são vinculados a uma obra."
    >
      {/* Upload */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="font-display text-lg">Importar modelo</CardTitle>
          <p className="text-xs text-muted-foreground">PDF, DOCX ou imagem — até 10 MB.</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[200px_240px_1fr]">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocTemplate["category"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="termo">Termo (por obra)</SelectItem>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {category === "termo" && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Obra</label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-3 self-end rounded-md border border-dashed border-border p-3 hover:bg-muted/40">
            <Upload className="h-5 w-5 text-accent" />
            <span className="flex-1 text-sm">Clique para selecionar arquivo(s)</span>
            <input type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Termo de confidencialidade</CardTitle>
            <p className="text-xs text-muted-foreground">Selecione a obra para ver os termos vinculados.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Selecione uma obra" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {termosObra.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum termo importado para {obra?.name ?? "esta obra"}. Use o painel acima.
              </p>
            ) : termosObra.map((t) => <TemplateRow key={t.id} tpl={t} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Outros modelos</CardTitle>
            <p className="text-xs text-muted-foreground">Contratos e demais modelos importados.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {outros.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum modelo importado.</p>
            ) : outros.map((t) => <TemplateRow key={t.id} tpl={t} />)}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function TemplateRow({ tpl }: { tpl: DocTemplate }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10">
        <FileText className="h-5 w-5 text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-sm">{tpl.name}</p>
        <p className="truncate text-xs text-muted-foreground">{tpl.filename} · {(tpl.size / 1024).toFixed(0)} KB</p>
      </div>
      <Button size="sm" variant="outline" asChild>
        <a href={tpl.data} download={tpl.filename}>
          <Download className="mr-1 h-4 w-4" /> Baixar
        </a>
      </Button>
      <Button size="icon" variant="ghost" onClick={() => { docTemplatesStore.remove(tpl.id); toast.success("Modelo removido."); }}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
