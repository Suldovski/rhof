import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { DocTemplate } from "@/lib/doc-templates-store";
import type { Employee } from "@/lib/employees";

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",").pop() || "";
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTermoFromTemplate(template: DocTemplate, employee: Employee, obraName?: string) {
  const mime = template.mime || "";
  const isDocx = mime.includes("word") || template.filename.toLowerCase().endsWith(".docx");

  if (!isDocx) {
    const rawBytes = dataUrlToUint8Array(template.data);
    const blob = new Blob([rawBytes], { type: template.mime || "application/octet-stream" });
    downloadBlob(blob, template.filename);
    return;
  }

  const zip = new PizZip(dataUrlToUint8Array(template.data));
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  const today = new Date().toLocaleDateString("pt-BR");

  doc.setData({
    NOME: employee.name,
    CPF: employee.cpf,
    MATRICULA: employee.id,
    OBRA: obraName || employee.site || employee.organograma || "",
    FUNCAO: employee.cargoFuncao || employee.role || "",
    DATA: today,
  });

  try {
    doc.render();
  } catch (err: any) {
    console.error("Erro ao gerar termo:", err);
    throw new Error("Não foi possível preencher o termo. Verifique os placeholders do modelo.");
  }

  const blob = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const safeName = (employee.name || "funcionario").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  downloadBlob(blob, `termo-${employee.id}-${safeName}.docx`);
}
