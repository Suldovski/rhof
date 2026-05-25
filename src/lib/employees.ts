import { useSyncExternalStore } from "react";

export type EmployeeStatus =
  | "admissao"
  | "mobilizacao"
  | "efetivo"
  | "ferias"
  | "afastado"
  | "desligado"
  | "ativo"; // legado (migrado para "efetivo")

export interface BankAccount {
  bank: string;
  agency: string;
  account: string;
  type: "CC" | "CP";
  pix: string;
}

export interface Dependente {
  id: string;
  nome: string;
  cpf: string;
  nascimento: string;
  cidade: string;
  uf: string;
  parentesco: string;
}

export interface CNHData {
  numero: string;
  primeiraHabilitacao: string;
  expedicao: string;
  validade: string;
  uf: string;
  categoria: string;
}

export interface DocAnexo {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Data URL (base64) — pequenos arquivos. Para arquivos grandes substituir por storage. */
  data: string;
  uploadedAt: string;
}

export type EmployeeTipo = "efetivo" | "pj" | "terceiro";

export interface RoleChange {
  from: string;
  to: string;
  date: string;
}

export interface Employee {
  /* Matrícula / status */
  id: string;
  status: EmployeeStatus;

  /* Foto (base64) — não vai para o FRE */
  photo?: string;

  /* Tipo de contrato + empresa (para PJ/terceiro) */
  tipo?: EmployeeTipo;
  empresaTerceiro?: string;

  /* Histórico de trocas de função */
  roleHistory?: RoleChange[];

  /* Dados pessoais (obrigatórios) */
  name: string;
  cpf: string;
  nascimento: string;

  sindicato: string;
  sindicatoUf: string;

  /* Endereço */
  endereco: string;
  enderecoNumero: string;
  cep: string;
  complemento: string;
  bairro: string;
  estado: string;
  municipio: string;
  telefone: string;
  telefoneRecado: string;

  municipioNascimento: string;
  estadoNascimento: string;
  nacionalidade: string;
  rne: string;

  sexo: "M" | "F" | "Outro" | "";
  racaCor: string;
  deficienciaFisica: string;
  estadoCivil: string;
  grauInstrucao: string;

  cnh?: CNHData;

  /* Dados do contrato */
  admission: string;
  organograma: string; // obra
  departamento: string;
  primeiroEmprego: boolean;
  periodoExperiencia: "30/30" | "45/45" | "60/60" | "outro" | "";
  periodoExperienciaOutro: string;
  vt: boolean;
  vtIda: number;
  vtVolta: number;
  adiantamento: boolean;
  valeAlimentacao: boolean;
  valorDescontoVA: number;
  escalaHorario: string;
  salarioHora: number;
  cargoFuncao: string;
  ajudaCusto: number;
  percentualPericulosidade: number;
  percentualInsalubridade: number;
  horasExtras: string;

  /* Pagamento */
  bank: BankAccount;

  /* Filiação */
  nomeMae: string;
  nomePai?: string;

  /* Dependentes */
  dependentes: Dependente[];

  /* Documentos anexados */
  documentos: DocAnexo[];

  /* Legado / extras */
  role: string; // cargo (para compat com telas atuais)
  department: "Obra" | "Engenharia" | "Administrativo" | "Seguranca";
  site: string; // nome da obra (compat)
  phone: string; // compat
  email: string;
  salary: number;
  rg: string;
  ctps: string;
  pis: string;
  address: string;
  certifications: string[];
}

const KEY = "bucagrans.employees.v2";

function makeEmpty(): Employee {
  return {
    id: "",
    status: "admissao",
    photo: "",
    tipo: "efetivo",
    empresaTerceiro: "",
    roleHistory: [],
    name: "",
    cpf: "",
    nascimento: "",
    sindicato: "",
    sindicatoUf: "",
    endereco: "",
    enderecoNumero: "",
    cep: "",
    complemento: "",
    bairro: "",
    estado: "",
    municipio: "",
    telefone: "",
    telefoneRecado: "",
    municipioNascimento: "",
    estadoNascimento: "",
    nacionalidade: "Brasileira",
    rne: "",
    sexo: "",
    racaCor: "",
    deficienciaFisica: "Não",
    estadoCivil: "",
    grauInstrucao: "",
    admission: "",
    organograma: "",
    departamento: "",
    primeiroEmprego: false,
    periodoExperiencia: "",
    periodoExperienciaOutro: "",
    vt: false,
    vtIda: 0,
    vtVolta: 0,
    adiantamento: false,
    valeAlimentacao: false,
    valorDescontoVA: 0,
    escalaHorario: "",
    salarioHora: 0,
    cargoFuncao: "",
    ajudaCusto: 0,
    percentualPericulosidade: 0,
    percentualInsalubridade: 0,
    horasExtras: "",
    bank: { bank: "", agency: "", account: "", type: "CC", pix: "" },
    nomeMae: "",
    nomePai: "",
    dependentes: [],
    documentos: [],
    role: "",
    department: "Obra",
    site: "",
    phone: "",
    email: "",
    salary: 0,
    rg: "",
    ctps: "",
    pis: "",
    address: "",
    certifications: [],
  };
}

const seed: Employee[] = [
  {
    ...makeEmpty(),
    id: "1042",
    name: "José Carlos Almeida",
    cpf: "123.456.789-00",
    role: "Pedreiro",
    cargoFuncao: "Pedreiro",
    department: "Obra",
    departamento: "Obra",
    site: "Residencial Vila Nova",
    organograma: "Residencial Vila Nova",
    admission: "2022-03-14",
    nascimento: "1985-06-12",
    status: "ativo",
    phone: "(11) 98123-4501",
    telefone: "(11) 98123-4501",
    telefoneRecado: "(11) 4321-7654",
    email: "jose.almeida@bucagrans.com.br",
    salary: 3200,
    salarioHora: 18.18,
    rg: "33.456.789-1",
    ctps: "9876543/0012",
    pis: "120.45678.90-1",
    address: "Rua das Acácias, 220 — Itaquera, SP",
    endereco: "Rua das Acácias",
    enderecoNumero: "220",
    bairro: "Itaquera",
    municipio: "São Paulo",
    estado: "SP",
    cep: "08230-000",
    sexo: "M",
    racaCor: "Parda",
    estadoCivil: "Casado",
    grauInstrucao: "Ensino Médio Completo",
    nomeMae: "Maria Almeida",
    nacionalidade: "Brasileira",
    municipioNascimento: "São Paulo",
    estadoNascimento: "SP",
    sindicato: "SINTRACON-SP - Sind. Trab. Ind. Constr. Civil de São Paulo",
    sindicatoUf: "SP",
    certifications: ["NR-18", "NR-35"],
    bank: { bank: "Itaú", agency: "0123", account: "45678-9", type: "CC", pix: "123.456.789-00" },
  },
  {
    ...makeEmpty(),
    id: "1043",
    name: "Marina Souza Lima",
    cpf: "234.567.890-11",
    role: "Engenheira Civil",
    cargoFuncao: "Engenheira Civil",
    department: "Engenharia",
    departamento: "Engenharia",
    site: "Edifício Atlântico",
    organograma: "Edifício Atlântico",
    admission: "2021-07-02",
    nascimento: "1990-11-08",
    status: "ativo",
    phone: "(11) 99412-7820",
    telefone: "(11) 99412-7820",
    telefoneRecado: "(11) 3333-2211",
    email: "marina.lima@bucagrans.com.br",
    salary: 14500,
    salarioHora: 82.39,
    rg: "44.567.890-2",
    ctps: "1234567/0001",
    pis: "230.56789.01-2",
    address: "Av. Paulista, 1500 — Bela Vista, SP",
    endereco: "Av. Paulista",
    enderecoNumero: "1500",
    bairro: "Bela Vista",
    municipio: "São Paulo",
    estado: "SP",
    cep: "01310-100",
    sexo: "F",
    racaCor: "Branca",
    estadoCivil: "Solteira",
    grauInstrucao: "Pós-graduação",
    nomeMae: "Helena Souza",
    nacionalidade: "Brasileira",
    municipioNascimento: "Campinas",
    estadoNascimento: "SP",
    sindicato: "SINTRACON-SP - Sind. Trab. Ind. Constr. Civil de São Paulo",
    sindicatoUf: "SP",
    certifications: ["CREA-SP", "PMP", "NR-35"],
    bank: { bank: "Bradesco", agency: "2233", account: "11223-4", type: "CC", pix: "marina.lima@bucagrans.com.br" },
  },
  {
    ...makeEmpty(),
    id: "1044",
    name: "Antônio Pereira da Silva",
    cpf: "345.678.901-22",
    role: "Mestre de Obras",
    cargoFuncao: "Mestre de Obras",
    department: "Obra",
    departamento: "Obra",
    site: "Residencial Vila Nova",
    organograma: "Residencial Vila Nova",
    admission: "2018-01-10",
    nascimento: "1975-04-23",
    status: "ativo",
    phone: "(11) 97765-4432",
    telefone: "(11) 97765-4432",
    telefoneRecado: "(11) 2222-1111",
    email: "antonio.silva@bucagrans.com.br",
    salary: 6800,
    salarioHora: 38.64,
    rg: "55.678.901-3",
    ctps: "2345678/0002",
    pis: "340.67890.12-3",
    address: "Rua dos Pinheiros, 88 — São Miguel, SP",
    endereco: "Rua dos Pinheiros",
    enderecoNumero: "88",
    bairro: "São Miguel",
    municipio: "São Paulo",
    estado: "SP",
    sexo: "M",
    racaCor: "Pardo",
    estadoCivil: "Casado",
    grauInstrucao: "Ensino Médio Completo",
    nomeMae: "Joana Pereira",
    nacionalidade: "Brasileira",
    sindicato: "SINTRACON-SP - Sind. Trab. Ind. Constr. Civil de São Paulo",
    sindicatoUf: "SP",
    certifications: ["NR-18", "NR-35", "NR-33"],
    bank: { bank: "Caixa", agency: "0345", account: "00098-7", type: "CP", pix: "345.678.901-22" },
  },
  {
    ...makeEmpty(),
    id: "1045",
    name: "Carla Mendes Ribeiro",
    cpf: "456.789.012-33",
    role: "Analista de RH",
    cargoFuncao: "Analista de RH",
    department: "Administrativo",
    departamento: "Administrativo",
    site: "Sede Administrativa",
    organograma: "Sede Administrativa",
    admission: "2023-05-22",
    status: "ferias",
    phone: "(11) 98876-1122",
    telefone: "(11) 98876-1122",
    email: "carla.mendes@bucagrans.com.br",
    salary: 5400,
    rg: "66.789.012-4",
    ctps: "3456789/0003",
    pis: "450.78901.23-4",
    address: "Rua Augusta, 940 — Consolação, SP",
    nomeMae: "Lúcia Ribeiro",
    sindicato: "SINTRACON-SP - Sind. Trab. Ind. Constr. Civil de São Paulo",
    sindicatoUf: "SP",
    bank: { bank: "Nubank", agency: "0001", account: "55667-8", type: "CC", pix: "(11) 98876-1122" },
  },
  {
    ...makeEmpty(),
    id: "1046",
    name: "Roberto Nunes Tavares",
    cpf: "567.890.123-44",
    role: "Técnico de Segurança",
    cargoFuncao: "Técnico de Segurança",
    department: "Seguranca",
    departamento: "Seguranca",
    site: "Edifício Atlântico",
    organograma: "Edifício Atlântico",
    admission: "2020-11-03",
    status: "ativo",
    phone: "(11) 99001-5566",
    telefone: "(11) 99001-5566",
    email: "roberto.nunes@bucagrans.com.br",
    salary: 4900,
    rg: "77.890.123-5",
    ctps: "4567890/0004",
    pis: "560.89012.34-5",
    address: "Rua do Comércio, 12 — Tatuapé, SP",
    nomeMae: "Sandra Nunes",
    certifications: ["NR-18", "NR-35", "NR-33", "NR-06"],
    bank: { bank: "Santander", agency: "0456", account: "22334-5", type: "CC", pix: "567.890.123-44" },
  },
  {
    ...makeEmpty(),
    id: "1047",
    name: "Pedro Henrique Costa",
    cpf: "678.901.234-55",
    role: "Carpinteiro",
    cargoFuncao: "Carpinteiro",
    department: "Obra",
    departamento: "Obra",
    site: "Galpão Industrial Sul",
    organograma: "Galpão Industrial Sul",
    admission: "2024-02-19",
    status: "ativo",
    phone: "(11) 98233-7788",
    email: "pedro.costa@bucagrans.com.br",
    salary: 3100,
    rg: "88.901.234-6",
    ctps: "5678901/0005",
    pis: "670.90123.45-6",
    address: "Rua das Palmeiras, 345 — Guarulhos, SP",
    nomeMae: "Rosa Costa",
    certifications: ["NR-18"],
    bank: { bank: "Banco do Brasil", agency: "1234", account: "33445-6", type: "CC", pix: "pedro.costa@bucagrans.com.br" },
  },
];

import { departmentFromRole } from "./role-department";

function migrate(list: Employee[]): Employee[] {
  return list.map((e) => {
    const status = (e.status as any) === "ativo" ? "efetivo" : e.status;
    const dept = departmentFromRole(e.cargoFuncao || e.role || "");
    return { ...e, status, department: dept as any, departamento: dept };
  });
}

let state: Employee[] = (() => {
  if (typeof window === "undefined") return migrate(seed);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Employee[];
      if (Array.isArray(parsed) && parsed.length > 0) return migrate(parsed);
    }
  } catch {}
  return migrate(seed);
})();

const listeners = new Set<() => void>();

function commit(next: Employee[]) {
  state = next;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

function nextMatricula(isPJ = false): string {
  if (isPJ) {
    const max = state.reduce((m, e) => {
      const match = /^PJ-(\d+)$/i.exec(e.id);
      if (match) {
        const n = parseInt(match[1], 10);
        return n > m ? n : m;
      }
      return m;
    }, 0);
    return `PJ-${String(max + 1).padStart(3, "0")}`;
  }
  const max = state.reduce((m, e) => {
    const n = parseInt(e.id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 1041);
  return String(max + 1);
}

export const employeesStore = {
  list: () => state,
  get: (id: string) => state.find((e) => e.id === id),
  add: (data: Partial<Employee>) => {
    const rawId = data.id?.trim() || "";
    const isPJ = /pj/i.test(rawId);
    let id = rawId;
    if (!id) id = nextMatricula(false);
    else if (isPJ && !/^PJ-/i.test(id)) id = `PJ-${id.replace(/pj/ig, "").replace(/[^a-z0-9]/gi, "") || String(Date.now()).slice(-4)}`;
    if (state.some((e) => e.id === id)) {
      throw new Error("Já existe um funcionário com esta matrícula.");
    }
    const fresh: Employee = { ...makeEmpty(), ...data, id };
    fresh.role = fresh.role || fresh.cargoFuncao;
    fresh.site = fresh.site || fresh.organograma;
    fresh.phone = fresh.phone || fresh.telefone;
    const dept = departmentFromRole(fresh.cargoFuncao || fresh.role || "");
    fresh.department = dept as any;
    fresh.departamento = dept;
    fresh.salary = fresh.salary || fresh.salarioHora * 220;
    fresh.address = fresh.address || `${fresh.endereco}, ${fresh.enderecoNumero} — ${fresh.bairro}, ${fresh.municipio}/${fresh.estado}`;
    commit([...state, fresh]);
    return fresh;
  },
  update: (id: string, patch: Partial<Employee>) => {
    commit(state.map((e) => {
      if (e.id !== id) return e;
      const merged = { ...e, ...patch };
      if (patch.cargoFuncao || patch.role) {
        const dept = departmentFromRole(merged.cargoFuncao || merged.role || "");
        merged.department = dept as any;
        merged.departamento = dept;
      }
      return merged;
    }));
  },
  remove: (id: string) => commit(state.filter((e) => e.id !== id)),
  removeAll: () => commit([]),
  reset: () => commit(seed),
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useEmployees(): Employee[] {
  return useSyncExternalStore(subscribe, () => state, () => seed);
}

export function useEmployee(id: string): Employee | undefined {
  return useEmployees().find((e) => e.id === id);
}

// Compat com código legado (deprecated — preferir useEmployees)
export const employees = state;
export function getEmployee(id: string): Employee | undefined {
  return state.find((e) => e.id === id);
}

export const sites = [
  "Residencial Vila Nova",
  "Edifício Atlântico",
  "Galpão Industrial Sul",
  "Sede Administrativa",
];

export { makeEmpty };
