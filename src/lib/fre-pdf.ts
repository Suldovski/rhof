import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Employee } from "./employees";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (s: string) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");
const v = (s?: string | number | boolean) =>
  s === undefined || s === null || s === "" ? "—" : String(s);
const sn = (b: boolean) => (b ? "Sim" : "Não");

export function generateFREPDF(e: Employee): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(15, 27, 61);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA PARA REGISTRO DE EMPREGADO — FRE", 14, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("BUCAGRANS CONSTRUTORA DE OBRAS SA — CNPJ 85.465.938/0001-30", 14, 16);
  doc.text(`Matrícula #${e.id}`, pageW - 14, 16, { align: "right" });
  doc.setTextColor(20);

  let y = 28;
  const section = (title: string) => {
    autoTable(doc, {
      startY: y,
      head: [[{ content: title, styles: { halign: "left", fillColor: [15, 27, 61], textColor: 255, fontStyle: "bold" } }]],
      body: [],
      theme: "plain",
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY;
  };

  const table = (rows: [string, string, string?, string?][]) => {
    autoTable(doc, {
      startY: y,
      body: rows.map((r) => r.map((c) => ({ content: c ?? "" }))),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: { 0: { fontStyle: "bold", fillColor: [240, 244, 250], cellWidth: 35 }, 2: { fontStyle: "bold", fillColor: [240, 244, 250], cellWidth: 35 } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  };

  section("Dados Pessoais");
  table([
    ["Nome", v(e.name), "CPF", v(e.cpf)],
    ["Nascimento", fmtDate(e.nascimento), "Sexo", v(e.sexo)],
    ["Sindicato", v(e.sindicato), "UF Sindicato", v(e.sindicatoUf)],
    ["Endereço", `${v(e.endereco)}, ${v(e.enderecoNumero)}`, "CEP", v(e.cep)],
    ["Complemento", v(e.complemento), "Bairro", v(e.bairro)],
    ["Município", v(e.municipio), "Estado", v(e.estado)],
    ["Telefone", v(e.telefone), "Telefone recado", v(e.telefoneRecado)],
    ["Município nascimento", v(e.municipioNascimento), "Estado nascimento", v(e.estadoNascimento)],
    ["Nacionalidade", v(e.nacionalidade), "RNE", v(e.rne)],
    ["Raça/cor", v(e.racaCor), "Deficiência física", v(e.deficienciaFisica)],
    ["Estado civil", v(e.estadoCivil), "Grau de instrução", v(e.grauInstrucao)],
  ]);

  if (e.cnh && e.cnh.numero) {
    section("CNH");
    table([
      ["Nº CNH", v(e.cnh.numero), "1ª habilitação", fmtDate(e.cnh.primeiraHabilitacao)],
      ["Expedição", fmtDate(e.cnh.expedicao), "Validade", fmtDate(e.cnh.validade)],
      ["UF", v(e.cnh.uf), "Categoria", v(e.cnh.categoria)],
    ]);
  }

  section("Dados para Contrato");
  table([
    ["Admissão", fmtDate(e.admission), "Organograma (obra)", v(e.organograma)],
    ["Departamento", v(e.departamento), "1º emprego", sn(e.primeiroEmprego)],
    ["Per. experiência", e.periodoExperiencia === "outro" ? v(e.periodoExperienciaOutro) : v(e.periodoExperiencia), "VT", e.vt ? `Sim — Ida ${fmtBRL(e.vtIda)} / Volta ${fmtBRL(e.vtVolta)}` : "Não"],
    ["Adiantamento", sn(e.adiantamento), "Vale alimentação", sn(e.valeAlimentacao)],
    ["Desconto VA/CB", fmtBRL(e.valorDescontoVA), "Escala/Horário", v(e.escalaHorario)],
    ["Salário/hora", fmtBRL(e.salarioHora), "Cargo/Função", v(e.cargoFuncao)],
    ["Ajuda de custo", fmtBRL(e.ajudaCusto), "% Periculosidade", `${e.percentualPericulosidade}%`],
    ["% Insalubridade", `${e.percentualInsalubridade}%`, "Horas extras", v(e.horasExtras)],
  ]);

  section("Informações para Pagamento");
  table([
    ["Banco", v(e.bank.bank), "Agência", v(e.bank.agency)],
    ["Conta", v(e.bank.account), "Tipo", e.bank.type === "CC" ? "Conta Corrente" : "Conta Poupança"],
    ["Chave PIX", v(e.bank.pix), "", ""],
  ]);

  section("Filiação");
  table([
    ["Nome da mãe", v(e.nomeMae), "Nome do pai", v(e.nomePai)],
  ]);

  if (e.dependentes.length > 0) {
    section("Dependentes");
    autoTable(doc, {
      startY: y,
      head: [["Nome", "CPF", "Nascimento", "Cidade/UF", "Parentesco"]],
      body: e.dependentes.map((d) => [d.nome, d.cpf, fmtDate(d.nascimento), `${d.cidade}/${d.uf}`, d.parentesco]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [230, 235, 245], textColor: 20 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  }

  // Rodapé com data
  const today = new Date().toLocaleDateString("pt-BR");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Emitido em ${today}`, 14, doc.internal.pageSize.getHeight() - 8);

  return doc;
}

export function downloadFRE(e: Employee) {
  const doc = generateFREPDF(e);
  const safe = e.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`ficha-registro-${e.id}-${safe || "func"}.pdf`);
}
