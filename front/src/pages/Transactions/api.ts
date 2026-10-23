export type Opcao = { id: number; nome: string };

export type Categoria = Opcao & { cor: string };

export type FormaPagamento = Opcao & { diaValidade: number | null };

export type NovaTransacao = {
  tipo: "RECEITA" | "DESPESA";
  valor: number;
  descricao: string;
  data: string;
  totalParcelas?: number;
  categoryId: number | null;
  formaPagamentoId?: number;
};

export type Transacao = {
  id: number;
  tipo: "RECEITA" | "DESPESA";
  valor: string;
  descricao: string;
  data: string;
  dataVencimento: string | null;
  parcelamentoId: string | null;
  parcelaAtual: number | null;
  totalParcelas: number | null;
  categoryId: number | null;
  formaPagamentoId: number | null;
  formaPagamento: FormaPagamento | null;
  category: Categoria | null;
};

const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api"
).replace(/\/$/, "");

function cabecalhos() {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function buscar<T>(caminho: string, signal: AbortSignal) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    signal,
    headers: cabecalhos(),
  });
  if (!resposta.ok) return [];
  return (await resposta.json()) as T[];
}

export async function apagarTransacao(id: number) {
  const resposta = await fetch(`${API_URL}/transactions/${id}`, {
    method: "DELETE",
    headers: cabecalhos(),
  });
  if (!resposta.ok && resposta.status !== 404) {
    throw new Error("Erro ao apagar a transação.");
  }
}

export async function salvarTransacao(dados: NovaTransacao, id?: number) {
  const resposta = await fetch(`${API_URL}/transactions${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST",
    headers: { ...cabecalhos(), "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(corpo?.error ?? "Não foi possível salvar a transação.");
  }
}
