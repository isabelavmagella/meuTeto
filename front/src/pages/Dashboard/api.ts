import { requisitar } from "../../lib/api";

export type Mes = {
  numeroMes: number;
  nomeMes: string;
  receita: number;
  despesa: number;
  saldoFinal: number;
};

// `subcategorias` traz só os gastos com subcategoria; o que faltar para
// chegar em `valor` é gasto sem subcategoria.
export type GastoCategoria = {
  nome: string;
  cor: string;
  valor: number;
  subcategorias: { id: number; nome: string; valor: number }[];
};

export type ResumoMensal = {
  kpis: {
    receita: {
      valor: number;
      totalReceitaMesAnterior: number;
      diferencaPorcentagem: number;
    };
    despesa: {
      valor: number;
      totalDespesaMesAnterior: number;
      diferencaPorcentagem: number;
    };
    saldo: {
      valor: number;
      saldoFinalMesAnterior: number;
      diferencaPorcentagem: number;
    };
  };
  despesaPorCategoria: GastoCategoria[];
  comparacaoOrcamento: {
    nomeCategoria: string;
    corCategoria: string;
    limiteOrcamento: number;
    valorGasto: number;
    porcentagemUsada: number;
    ultrapassou: boolean;
  }[];
};

export type HistoricoAnual = {
  ano: number;
  historico: Mes[];
};

const PREFIXO = "/dashboard";

export class ErroApi extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

async function get<T>(
  caminho: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const resposta = await requisitar(`${PREFIXO}${caminho}?${query}`, {
    signal,
  });

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ErroApi(
      corpo?.error ?? "Erro ao carregar os dados.",
      resposta.status,
    );
  }

  return (await resposta.json()) as T;
}

export function buscarResumoMensal(mesAno: string, signal?: AbortSignal) {
  return get<ResumoMensal>("/monthly-summary", { mesAno }, signal);
}

export function buscarHistorico(ano: number, signal?: AbortSignal) {
  return get<HistoricoAnual>(
    "/historical-trends",
    { ano: String(ano) },
    signal,
  );
}
