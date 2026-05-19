export interface CepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export async function fetchCep(cep: string): Promise<CepData | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.erro) return null;
    return {
      logradouro: d.logradouro ?? "",
      bairro: d.bairro ?? "",
      localidade: d.localidade ?? "",
      uf: d.uf ?? "",
    };
  } catch {
    return null;
  }
}
