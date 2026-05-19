import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Employee } from "./employees";

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

export function downloadEmployeesPDF(
  employees: Employee[],
  opts: { siteName?: string } = {},
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const today = new Date().toLocaleDateString("pt-BR");
  const title = opts.siteName
    ? `Funcionários — ${opts.siteName}`
    : "Funcionários — Todas as obras";

  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Total: ${employees.length} · Emitido em ${today}`, 14, 20);
  doc.setTextColor(20);

  autoTable(doc, {
    startY: 26,
    head: [["Matrícula", "Nome", "CPF", "Função", "Obra", "Admissão", "Status"]],
    body: employees.map((e) => [
      e.id,
      (e.name || "").toUpperCase(),
      e.cpf || "—",
      (e.cargoFuncao || e.role || "").toUpperCase(),
      (e.organograma || e.site || "").toUpperCase(),
      fmtDate(e.admission),
      (e.status || "").toUpperCase(),
    ]),
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 27, 61], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  const safe = (opts.siteName || "todos").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`funcionarios-${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
