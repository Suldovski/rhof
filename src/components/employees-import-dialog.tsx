import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileDown, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  buildManualPreview,
  createBlankMapping,
  exportImportErrorsCsv,
  getTemplateLabel,
  importEmployeeSpreadsheet,
  inspectEmployeeSpreadsheet,
  mappingIsComplete,
  type DetectedTemplate,
  type ImportMapping,
  type ImportRunResult,
  type SpreadsheetInspection,
  type PreviewRow,
  previewRowToText,
} from "@/lib/employees-import";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (result: ImportRunResult) => void;
}

function mappingLabel(key: keyof ImportMapping): string {
  const labels: Record<keyof ImportMapping, string> = {
    re: "RE",
    nome: "Nome",
    cpf: "CPF",
    dataNascimento: "Data nasc.",
    dataAdmissao: "Data admissão",
    cbo: "CBO",
    funcao: "Função",
    obra: "Obra",
    salarioHora: "Salário hora",
    salarioMensal: "Salário mensal",
    termino30Dias: "30 dias",
    termino60Dias: "60 dias",
  };
  return labels[key];
}

function valueToIndex(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : -1;
}

function indexToValue(value: number | undefined): string {
  return typeof value === "number" && value >= 0 ? String(value) : "-1";
}

function formatDate(value: Date | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return "-";
  return value.toLocaleDateString("pt-BR");
}

function formatMoney(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function previewRowsFromInspection(inspection: SpreadsheetInspection | null, mapping: ImportMapping): PreviewRow[] {
  if (!inspection) return [];
  return buildManualPreview(inspection.rawRows, mapping, inspection.dataStartIndex + 1);
}

export function EmployeesImportDialog({ open, onOpenChange, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<SpreadsheetInspection | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>(createBlankMapping());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportRunResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setInspection(null);
      setMapping(createBlankMapping());
      setLoading(false);
      setImporting(false);
      setSummary(null);
      setDragOver(false);
    }
  }, [open]);

  const previews = useMemo(() => previewRowsFromInspection(inspection, mapping), [inspection, mapping]);

  const canImport = !!file && !!inspection && mappingIsComplete(mapping) && !importing;

  const loadFile = async (selected: File) => {
    setLoading(true);
    setSummary(null);
    try {
      const info = await inspectEmployeeSpreadsheet(selected);
      setFile(selected);
      setInspection(info);
      setMapping(info.template === "manual" ? createBlankMapping() : info.suggestedMapping);
      toast.success(`Planilha carregada: ${getTemplateLabel(info.template)}`);
    } catch (error: any) {
      toast.error(error?.message ?? "Falha ao ler a planilha.");
      setFile(null);
      setInspection(null);
      setMapping(createBlankMapping());
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    await loadFile(selected);
    event.target.value = "";
  };

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const selected = event.dataTransfer.files?.[0];
    if (!selected) return;
    await loadFile(selected);
  };

  const updateMapping = (key: keyof ImportMapping, value: string) => {
    setMapping((current) => ({
      ...current,
      [key]: valueToIndex(value),
    }));
  };

  const handleImport = async () => {
    if (!file || !inspection) return;
    setImporting(true);
    try {
      const result = await importEmployeeSpreadsheet(file, mapping);
      setSummary(result);
      onImported?.(result);
      toast.success("Importação concluída.");
    } catch (error: any) {
      toast.error(error?.message ?? "Falha durante a importação.");
    } finally {
      setImporting(false);
    }
  };

  const mappingFields: Array<keyof ImportMapping> = [
    "re",
    "nome",
    "cpf",
    "dataNascimento",
    "dataAdmissao",
    "cbo",
    "funcao",
    "obra",
    "salarioHora",
    "salarioMensal",
    "termino30Dias",
    "termino60Dias",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Importar planilha de funcionários</DialogTitle>
        </DialogHeader>

        {!summary ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <Card className="border-dashed">
              <CardContent className="space-y-4 p-4">
                <div
                  className={`rounded-xl border-2 border-dashed p-6 text-center transition ${dragOver ? "border-accent bg-accent/5" : "border-border bg-muted/20"}`}
                  onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="font-semibold">Arraste a planilha ou escolha um arquivo</p>
                  <p className="mt-1 text-xs text-muted-foreground">Formatos aceitos: .xlsx, .xls, .csv</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileUp className="h-4 w-4" />
                  {loading ? "Lendo planilha..." : file ? `Arquivo carregado: ${file.name}` : "Nenhum arquivo selecionado"}
                </div>

                {inspection && (
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{getTemplateLabel(inspection.template)}</span>
                      <span className="text-muted-foreground">· {inspection.sheetName || "Aba principal"}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      A planilha foi analisada automaticamente. Ajuste o mapeamento abaixo se algo não bater.
                    </p>
                  </div>
                )}

                {inspection && inspection.template === "manual" && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
                    Detecção automática não encontrou um padrão conhecido. Use o mapeamento manual abaixo.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Pré-visualização</p>
                    <p className="text-xs text-muted-foreground">Primeiras 5 linhas após validação</p>
                  </div>
                  {inspection && (
                    <Button variant="ghost" size="sm" onClick={() => setMapping(inspection.suggestedMapping)}>
                      Restaurar mapeamento sugerido
                    </Button>
                  )}
                </div>

                {inspection ? (
                  <ScrollArea className="h-[240px] rounded-md border">
                    <div className="space-y-2 p-3">
                      {previews.map((row) => (
                        <div
                          key={row.rowNumber}
                          className={`rounded-md border p-3 text-sm ${row.errors.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">Linha {row.rowNumber}</span>
                            {row.errors.length > 0 ? (
                              <span className="text-xs text-destructive">{row.errors.join(" · ")}</span>
                            ) : (
                              <span className="text-xs text-success">OK</span>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">{previewRowToText(row)}</p>
                        </div>
                      ))}
                      {previews.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">Carregue um arquivo para ver a prévia.</p>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    A pré-visualização aparecerá após selecionar o arquivo.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Mapeamento manual</p>
                    <p className="text-xs text-muted-foreground">Use quando a detecção automática falhar ou para ajustar colunas</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {inspection ? `${inspection.columnChoices.length} colunas detectadas` : "Sem arquivo carregado"}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {mappingFields.map((field) => {
                    const isOptional = field === "termino30Dias" || field === "termino60Dias";
                    return (
                      <div key={field} className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{mappingLabel(field)}</Label>
                        <Select
                          value={indexToValue(mapping[field])}
                          onValueChange={(value) => updateMapping(field, value)}
                          disabled={!inspection}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isOptional ? "Não existente" : "Selecione a coluna"} />
                          </SelectTrigger>
                          <SelectContent>
                            {isOptional && <SelectItem value="-1">Não existente</SelectItem>}
                            {inspection?.columnChoices.map((choice) => (
                              <SelectItem key={choice.index} value={String(choice.index)}>
                                {choice.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-semibold">Importação finalizada</p>
                  <p className="text-xs text-muted-foreground">Revise o resumo e baixe o relatório de erros se necessário.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <SummaryStat label="✅ IMPORTADOS" value={summary.imported} tone="success" />
                <SummaryStat label="🔄 ATUALIZADOS" value={summary.updated} tone="accent" />
                <SummaryStat label="⏭️ IGNORADOS" value={summary.ignored} tone="muted" />
                <SummaryStat label="❌ ERROS" value={summary.errors} tone="destructive" />
              </div>

              {summary.errorDetails.length > 0 ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="mb-2 text-sm font-semibold">Detalhes dos erros</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {summary.errorDetails.map((detail) => (
                      <li key={detail}>- {detail}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum erro encontrado na importação.</p>
              )}
            </CardContent>
          </Card>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!summary ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleImport}
                disabled={!canImport}
              >
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Confirmar Importação
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => exportImportErrorsCsv(summary.errorDetails)}
                disabled={summary.errorDetails.length === 0}
              >
                Baixar relatório
              </Button>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: "success" | "accent" | "muted" | "destructive" }) {
  const tones: Record<typeof tone, string> = {
    success: "border-success/30 bg-success/10 text-success",
    accent: "border-accent/30 bg-accent/10 text-accent",
    muted: "border-border bg-muted/20 text-muted-foreground",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  };

  return (
    <div className={`rounded-lg border p-3 text-center ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-display">{value}</p>
    </div>
  );
}
