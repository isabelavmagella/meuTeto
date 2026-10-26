import { API_URL, buscar, cabecalhos, enviar } from "../../lib/api";

export type Opcao = { id: number; nome: string };

export type Categoria = Opcao & { cor: string };

export type Subcategoria = Opcao & { categoryId: number };

export type FormaPagamento = Opcao & { diaValidade: number | null };

export type NovaTransacao = {
  tipo: "RECEITA" | "DESPESA";
  valor: number;
  descricao: string;
  data: string;
  totalParcelas?: number;
  categoryId: number | null;
  subcategoryId: number | null;
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
  subcategoryId: number | null;
  formaPagamentoId: number | null;
  formaPagamento: FormaPagamento | null;
  category: Categoria | null;
  subcategory: Subcategoria | null;
};

export { buscar };

export async function apagarTransacao(id: number) {
  const resposta = await fetch(`${API_URL}/transactions/${id}`, {
    method: "DELETE",
    headers: cabecalhos(),
  });
  if (!resposta.ok && resposta.status !== 404) {
    throw new Error("Erro ao apagar a transação.");
  }
}

export function salvarTransacao(dados: NovaTransacao, id?: number) {
  return enviar(
    `/transactions${id ? `/${id}` : ""}`,
    id ? "PUT" : "POST",
    dados,
    "Não foi possível salvar a transação.",
  );
}
