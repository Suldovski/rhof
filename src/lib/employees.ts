import { useSyncExternalStore } from "react";
import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  onSnapshot 
} from 'firebase/firestore';
import { departmentFromRole } from "./role-department";

export type EmployeeStatus =
  | "admissao"
  | "mobilizacao"
  | "efetivo"
  | "ferias"
  | "afastado"
  | "desligado"
  | "ativo";

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
  id: string;
  status: EmployeeStatus;
  photo?: string;
  tipo?: EmployeeTipo;
  empresaTerceiro?: string;
  roleHistory?: RoleChange[];
  name: string;
  cpf: string;
  nascimento: string;
  sindicato: string;
  sindicatoUf: string;
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
  admission: string;
  organograma: string;
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
  bank: BankAccount;
  nomeMae: string;
  nomePai?: string;
  dependentes: Dependente[];
  documentos: DocAnexo[];
  role: string;
  department: "Obra" | "Engenharia" | "Administrativo" | "Seguranca";
  site: string;
  phone: string;
  email: string;
  salary: number;
  rg: string;
  ctps: string;
  pis: string;
  address: string;
  certifications: string[];
  reImport?: string;
  nomeImport?: string;
  cpfDigits?: string;
  dataNascimentoImport?: string;
  dataAdmissaoImport?: string;
  cbo?: string;
  funcaoImport?: string;
  obraImport?: string;
  salarioHoraImport?: number;
  salarioMensalImport?: number;
  termino30Dias?: string;
  termino60Dias?: string;
}

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
    reImport: "",
    nomeImport: "",
    cpfDigits: "",
    dataNascimentoImport: "",
    dataAdmissaoImport: "",
    cbo: "",
    funcaoImport: "",
    obraImport: "",
    salarioHoraImport: 0,
    salarioMensalImport: 0,
    termino30Dias: "",
    termino60Dias: "",
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
    status: "efetivo",
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
    status: "efetivo",
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
    status: "efetivo",
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
    status: "efetivo",
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
    status: "efetivo",
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

function migrate(list: Employee[]): Employee[] {
  return list.map((e) => {
    const status = (e.status as any) === "ativo" ? "efetivo" : e.status;
    const dept = departmentFromRole(e.cargoFuncao || e.role || "");
    return normalizeEmployeeRecord({ ...makeEmpty(), ...e, status, department: dept as any, departamento: dept } as Employee);
  });
}

function upperText(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function keepText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmployeeRecord(employee: Employee): Employee {
  const dept = departmentFromRole(employee.cargoFuncao || employee.role || "");

  return {
    ...employee,
    name: upperText(employee.name),
    empresaTerceiro: upperText(employee.empresaTerceiro),
    roleHistory: employee.roleHistory?.map((change) => ({
      ...change,
      from: upperText(change.from),
      to: upperText(change.to),
    })),
    role: upperText(employee.role),
    cpf: keepText(employee.cpf),
    nascimento: keepText(employee.nascimento),
    sindicato: upperText(employee.sindicato),
    sindicatoUf: keepText(employee.sindicatoUf),
    endereco: upperText(employee.endereco),
    enderecoNumero: keepText(employee.enderecoNumero),
    cep: keepText(employee.cep),
    complemento: upperText(employee.complemento),
    bairro: upperText(employee.bairro),
    estado: keepText(employee.estado),
    municipio: upperText(employee.municipio),
    telefone: keepText(employee.telefone),
    telefoneRecado: keepText(employee.telefoneRecado),
    municipioNascimento: upperText(employee.municipioNascimento),
    estadoNascimento: keepText(employee.estadoNascimento),
    nacionalidade: upperText(employee.nacionalidade),
    rne: keepText(employee.rne),
    racaCor: upperText(employee.racaCor),
    deficienciaFisica: upperText(employee.deficienciaFisica),
    estadoCivil: upperText(employee.estadoCivil),
    grauInstrucao: upperText(employee.grauInstrucao),
    admission: keepText(employee.admission),
    organograma: upperText(employee.organograma),
    department: dept as any,
    departamento: dept,
    primeiroEmprego: employee.primeiroEmprego,
    periodoExperiencia: employee.periodoExperiencia,
    periodoExperienciaOutro: upperText(employee.periodoExperienciaOutro),
    vt: employee.vt,
    vtIda: employee.vtIda,
    vtVolta: employee.vtVolta,
    adiantamento: employee.adiantamento,
    valeAlimentacao: employee.valeAlimentacao,
    valorDescontoVA: employee.valorDescontoVA,
    escalaHorario: upperText(employee.escalaHorario),
    salarioHora: employee.salarioHora,
    cargoFuncao: upperText(employee.cargoFuncao),
    ajudaCusto: employee.ajudaCusto,
    percentualPericulosidade: employee.percentualPericulosidade,
    percentualInsalubridade: employee.percentualInsalubridade,
    horasExtras: upperText(employee.horasExtras),
    bank: {
      bank: upperText(employee.bank.bank),
      agency: keepText(employee.bank.agency),
      account: keepText(employee.bank.account),
      type: employee.bank.type,
      pix: keepText(employee.bank.pix),
    },
    nomeMae: upperText(employee.nomeMae),
    nomePai: upperText(employee.nomePai),
    dependentes: employee.dependentes.map((dependente) => ({
      ...dependente,
      nome: upperText(dependente.nome),
      cpf: keepText(dependente.cpf),
      nascimento: keepText(dependente.nascimento),
      cidade: upperText(dependente.cidade),
      uf: keepText(dependente.uf),
      parentesco: upperText(dependente.parentesco),
    })),
    documentos: employee.documentos,
    site: upperText(employee.site),
    phone: keepText(employee.phone),
    email: keepText(employee.email),
    rg: keepText(employee.rg),
    ctps: keepText(employee.ctps),
    pis: keepText(employee.pis),
    address: upperText(employee.address),
    certifications: employee.certifications.map((certification) => upperText(certification)),
    reImport: keepText(employee.reImport),
    nomeImport: upperText(employee.nomeImport),
    cpfDigits: keepText(employee.cpfDigits),
    dataNascimentoImport: keepText(employee.dataNascimentoImport),
    dataAdmissaoImport: keepText(employee.dataAdmissaoImport),
    cbo: keepText(employee.cbo),
    funcaoImport: upperText(employee.funcaoImport),
    obraImport: upperText(employee.obraImport),
    salarioHoraImport: employee.salarioHoraImport,
    salarioMensalImport: employee.salarioMensalImport,
    termino30Dias: keepText(employee.termino30Dias),
    termino60Dias: keepText(employee.termino60Dias),
  };
}

// Estado sincronizado com Firebase
const COLLECTION = "employees";
let state: Employee[] = [];
let isLoading = true;

const listeners = new Set<() => void>();

// Sincronização em tempo real com Firebase
if (typeof window !== "undefined") {
  const q = collection(db, COLLECTION);
  
  onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    state = migrate(docs);
    isLoading = false;
    
    // Cache local como backup
    try { 
      localStorage.setItem("bucagrans.employees.v2", JSON.stringify(state)); 
    } catch {}
    
    listeners.forEach((l) => l());
  }, (error) => {
    console.error("Erro ao carregar funcionários do Firebase:", error);
    isLoading = false;
    
    // Fallback para cache local
    try {
      const raw = localStorage.getItem("bucagrans.employees.v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state = migrate(parsed);
        }
      }
    } catch {}
    
    // Fallback para seed se não houver cache
    if (state.length === 0) {
      state = migrate(seed);
    }
    
    listeners.forEach((l) => l());
  });
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
  
  cpfExists: (cpf: string, excludeId?: string): boolean => {
    const normalized = cpf.replace(/[^\d]/g, "");
    return state.some((e) => {
      if (excludeId && e.id === excludeId) return false;
      return e.cpf.replace(/[^\d]/g, "") === normalized;
    });
  },

  add: async (data: Partial<Employee>) => {
    const rawId = data.id?.trim() || "";
    const isPJ = /pj/i.test(rawId);
    let id = rawId;
    if (!id) id = nextMatricula(false);
    else if (isPJ && !/^PJ-/i.test(id)) id = `PJ-${id.replace(/pj/ig, "").replace(/[^a-z0-9]/gi, "") || String(Date.now()).slice(-4)}`;
    
    if (state.some((e) => e.id === id)) {
      throw new Error("Já existe um funcionário com esta matrícula.");
    }

    if (data.cpf && employeesStore.cpfExists(data.cpf)) {
      throw new Error("Este CPF já está registrado no sistema.");
    }

    const fresh: Employee = normalizeEmployeeRecord({
      ...makeEmpty(),
      ...data,
      id,
      status: "admissao",
    } as Employee);
    fresh.role = fresh.role || fresh.cargoFuncao;
    fresh.site = fresh.site || fresh.organograma;
    fresh.phone = fresh.phone || fresh.telefone;
    const dept = departmentFromRole(fresh.cargoFuncao || fresh.role || "");
    fresh.department = dept as any;
    fresh.departamento = dept;
    fresh.salary = fresh.salary || fresh.salarioHora * 220;
    fresh.address = fresh.address || `${fresh.endereco}, ${fresh.enderecoNumero} — ${fresh.bairro}, ${fresh.municipio}/${fresh.estado}`;

    // Salvar no Firebase
    await setDoc(doc(db, COLLECTION, id), fresh);
    
    return fresh;
  },

  update: async (id: string, patch: Partial<Employee>) => {
    if (patch.cpf && employeesStore.cpfExists(patch.cpf, id)) {
      throw new Error("Este CPF já está registrado no sistema.");
    }

    const current = state.find((e) => e.id === id);
    if (!current) {
      throw new Error("Funcionário não encontrado.");
    }

    const next = normalizeEmployeeRecord({ ...current, ...patch });
    commit(state.map((e) => (e.id === id ? next : e)));

    // Atualizar no Firebase
    const employeeRef = doc(db, COLLECTION, id);
    await setDoc(employeeRef, next);
  },

  remove: async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  },
  
  removeAll: async () => {
    const batch = writeBatch(db);
    state.forEach(emp => {
      batch.delete(doc(db, COLLECTION, emp.id));
    });
    await batch.commit();
  },
  
  removeAllFromSite: async (siteName: string) => {
    const toRemove = state.filter((e) => (e.site || e.organograma || "") === siteName);
    const batch = writeBatch(db);
    toRemove.forEach(emp => {
      batch.delete(doc(db, COLLECTION, emp.id));
    });
    await batch.commit();
  },
  
  reset: async () => {
    await employeesStore.removeAll();
    for (const emp of seed) {
      await setDoc(doc(db, COLLECTION, emp.id), emp);
    }
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useEmployees(): Employee[] {
  return useSyncExternalStore(subscribe, () => state, () => migrate(seed));
}

export function useEmployee(id: string): Employee | undefined {
  return useEmployees().find((e) => e.id === id);
}

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