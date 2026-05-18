export type EmployeeStatus = "ativo" | "ferias" | "afastado" | "desligado";

export interface BankAccount {
  bank: string;
  agency: string;
  account: string;
  type: "CC" | "CP";
  pix: string;
}

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  role: string;
  department: "Obra" | "Engenharia" | "Administrativo" | "Seguranca";
  site: string;
  admission: string;
  status: EmployeeStatus;
  phone: string;
  email: string;
  salary: number;
  rg: string;
  ctps: string;
  pis: string;
  address: string;
  certifications: string[];
  bank: BankAccount;
}

export const employees: Employee[] = [
  {
    id: "1042",
    name: "José Carlos Almeida",
    cpf: "123.456.789-00",
    role: "Pedreiro",
    department: "Obra",
    site: "Residencial Vila Nova",
    admission: "2022-03-14",
    status: "ativo",
    phone: "(11) 98123-4501",
    email: "jose.almeida@bucagrans.com.br",
    salary: 3200,
    rg: "33.456.789-1",
    ctps: "9876543/0012",
    pis: "120.45678.90-1",
    address: "Rua das Acácias, 220 — Itaquera, SP",
    certifications: ["NR-18", "NR-35"],
    bank: { bank: "Itaú", agency: "0123", account: "45678-9", type: "CC", pix: "123.456.789-00" },
  },
  {
    id: "1043",
    name: "Marina Souza Lima",
    cpf: "234.567.890-11",
    role: "Engenheira Civil",
    department: "Engenharia",
    site: "Edifício Atlântico",
    admission: "2021-07-02",
    status: "ativo",
    phone: "(11) 99412-7820",
    email: "marina.lima@bucagrans.com.br",
    salary: 14500,
    rg: "44.567.890-2",
    ctps: "1234567/0001",
    pis: "230.56789.01-2",
    address: "Av. Paulista, 1500 — Bela Vista, SP",
    certifications: ["CREA-SP", "PMP", "NR-35"],
    bank: { bank: "Bradesco", agency: "2233", account: "11223-4", type: "CC", pix: "marina.lima@bucagrans.com.br" },
  },
  {
    id: "1044",
    name: "Antônio Pereira da Silva",
    cpf: "345.678.901-22",
    role: "Mestre de Obras",
    department: "Obra",
    site: "Residencial Vila Nova",
    admission: "2018-01-10",
    status: "ativo",
    phone: "(11) 97765-4432",
    email: "antonio.silva@bucagrans.com.br",
    salary: 6800,
    rg: "55.678.901-3",
    ctps: "2345678/0002",
    pis: "340.67890.12-3",
    address: "Rua dos Pinheiros, 88 — São Miguel, SP",
    certifications: ["NR-18", "NR-35", "NR-33"],
    bank: { bank: "Caixa", agency: "0345", account: "00098-7", type: "CP", pix: "345.678.901-22" },
  },
  {
    id: "1045",
    name: "Carla Mendes Ribeiro",
    cpf: "456.789.012-33",
    role: "Analista de RH",
    department: "Administrativo",
    site: "Sede Administrativa",
    admission: "2023-05-22",
    status: "ferias",
    phone: "(11) 98876-1122",
    email: "carla.mendes@bucagrans.com.br",
    salary: 5400,
    rg: "66.789.012-4",
    ctps: "3456789/0003",
    pis: "450.78901.23-4",
    address: "Rua Augusta, 940 — Consolação, SP",
    certifications: [],
    bank: { bank: "Nubank", agency: "0001", account: "55667-8", type: "CC", pix: "(11) 98876-1122" },
  },
  {
    id: "1046",
    name: "Roberto Nunes Tavares",
    cpf: "567.890.123-44",
    role: "Técnico de Segurança",
    department: "Seguranca",
    site: "Edifício Atlântico",
    admission: "2020-11-03",
    status: "ativo",
    phone: "(11) 99001-5566",
    email: "roberto.nunes@bucagrans.com.br",
    salary: 4900,
    rg: "77.890.123-5",
    ctps: "4567890/0004",
    pis: "560.89012.34-5",
    address: "Rua do Comércio, 12 — Tatuapé, SP",
    certifications: ["NR-18", "NR-35", "NR-33", "NR-06"],
    bank: { bank: "Santander", agency: "0456", account: "22334-5", type: "CC", pix: "567.890.123-44" },
  },
  {
    id: "1047",
    name: "Pedro Henrique Costa",
    cpf: "678.901.234-55",
    role: "Carpinteiro",
    department: "Obra",
    site: "Galpão Industrial Sul",
    admission: "2024-02-19",
    status: "ativo",
    phone: "(11) 98233-7788",
    email: "pedro.costa@bucagrans.com.br",
    salary: 3100,
    rg: "88.901.234-6",
    ctps: "5678901/0005",
    pis: "670.90123.45-6",
    address: "Rua das Palmeiras, 345 — Guarulhos, SP",
    certifications: ["NR-18"],
    bank: { bank: "Banco do Brasil", agency: "1234", account: "33445-6", type: "CC", pix: "pedro.costa@bucagrans.com.br" },
  },
  {
    id: "1048",
    name: "Luciana Aparecida Rocha",
    cpf: "789.012.345-66",
    role: "Engenheira de Segurança",
    department: "Seguranca",
    site: "Sede Administrativa",
    admission: "2019-09-15",
    status: "afastado",
    phone: "(11) 97654-3322",
    email: "luciana.rocha@bucagrans.com.br",
    salary: 11200,
    rg: "99.012.345-7",
    ctps: "6789012/0006",
    pis: "780.01234.56-7",
    address: "Av. Brigadeiro, 2200 — Jardins, SP",
    certifications: ["CREA-SP", "NR-35", "NR-18"],
    bank: { bank: "Itaú", agency: "0789", account: "44556-7", type: "CC", pix: "789.012.345-66" },
  },
  {
    id: "1049",
    name: "Marcos Vinícius Oliveira",
    cpf: "890.123.456-77",
    role: "Eletricista",
    department: "Obra",
    site: "Edifício Atlântico",
    admission: "2023-08-01",
    status: "ativo",
    phone: "(11) 98345-9911",
    email: "marcos.oliveira@bucagrans.com.br",
    salary: 3800,
    rg: "10.123.456-8",
    ctps: "7890123/0007",
    pis: "890.12345.67-8",
    address: "Rua dos Eletricistas, 77 — Mooca, SP",
    certifications: ["NR-10", "NR-35"],
    bank: { bank: "Inter", agency: "0001", account: "77889-0", type: "CC", pix: "890.123.456-77" },
  },
];

export function getEmployee(id: string): Employee | undefined {
  return employees.find((e) => e.id === id);
}

export const sites = [
  "Residencial Vila Nova",
  "Edifício Atlântico",
  "Galpão Industrial Sul",
  "Sede Administrativa",
];
