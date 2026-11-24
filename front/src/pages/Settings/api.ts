import { enviar } from "../../lib/api";

export { buscar } from "../../lib/api";

export type Categoria = { id: number; nome: string; cor: string };

export type Subcategoria = { id: number; nome: string; categoryId: number };

// `mes` vem como data ISO do 1º dia do mês; `valorLimite` é Decimal (string).
export type Orcamento = {
  id: number;
  mes: string;
  valorLimite: string;
  categoryId: number;
  category: Categoria;
};

export type FormaPagamento = {
  id: number;
  nome: string;
  diaValidade: number | null;
  diaFechamento: number | null;
};

// Datas vêm como ISO de meia-noite UTC; `valor` é Decimal (string).
export type TransacaoRecorrente = {
  id: number;
  tipo: "RECEITA" | "DESPESA";
  valor: string;
  descricao: string;
  diaDoMes: number;
  dataInicio: string;
  dataFim: string | null;
  categoryId: number | null;
  subcategoryId: number | null;
  formaPagamentoId: number | null;
  category: Categoria | null;
  subcategory: Subcategoria | null;
  formaPagamento: FormaPagamento | null;
};

export type DadosRecorrencia = {
  tipo: TransacaoRecorrente["tipo"];
  valor: number;
  descricao: string;
  diaDoMes: number;
  dataInicio: string;
  dataFim: string | null;
  categoryId: number | null;
  subcategoryId: number | null;
  formaPagamentoId: number | null;
};

export function salvarCategoria(dados: Omit<Categoria, "id">, id?: number) {
  return enviar(
    `/categories${id ? `/${id}` : ""}`,
    id ? "PUT" : "POST",
    dados,
    "Não foi possível salvar a categoria.",
  );
}

export function apagarCategorias(ids: number[]) {
  return enviar(
    "/categories",
    "DELETE",
    { ids },
    "Não foi possível apagar as categorias.",
  );
}

export function salvarSubcategoria(
  dados: Omit<Subcategoria, "id">,
  id?: number,
) {
  return enviar(
    `/subcategories${id ? `/${id}` : ""}`,
    id ? "PUT" : "POST",
    dados,
    "Não foi possível salvar a subcategoria.",
  );
}

export function apagarSubcategorias(ids: number[]) {
  return enviar(
    "/subcategories",
    "DELETE",
    { ids },
    "Não foi possível apagar as subcategorias.",
  );
}

export function salvarOrcamento(
  dados: { mesAno: string; valorLimite: number; categoryId: number },
  id?: number,
) {
  return enviar(
    `/budgets${id ? `/${id}` : ""}`,
    id ? "PUT" : "POST",
    dados,
    "Não foi possível salvar o orçamento.",
  );
}

export function apagarOrcamentos(ids: number[]) {
  return enviar(
    "/budgets",
    "DELETE",
    { ids },
    "Não foi possível apagar os orçamentos.",
  );
}

export function salvarRecorrencia(dados: DadosRecorrencia, id?: number) {
  return enviar(
    `/recurring-transactions${id ? `/${id}` : ""}`,
    id ? "PUT" : "POST",
    dados,
    "Não foi possível salvar a transação recorrente.",
  );
}

export function apagarRecorrencias(ids: number[]) {
  return enviar(
    "/recurring-transactions",
    "DELETE",
    { ids },
    "Não foi possível apagar as transações recorrentes.",
  );
}

export function salvarFormaPagamento(
  dados: Omit<FormaPagamento, "id">,
  id?: number,
) {
  return enviar(
    `/payments${id ? `/${id}` : ""}`,
    id ? "PUT" : "POST",
    dados,
    "Não foi possível salvar a forma de pagamento.",
  );
}

export function apagarFormasPagamento(ids: number[]) {
  return enviar(
    "/payments",
    "DELETE",
    { ids },
    "Não foi possível apagar as formas de pagamento.",
  );
}
