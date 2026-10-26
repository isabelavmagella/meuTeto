import { enviar } from "../../lib/api";

export { buscar } from "../../lib/api";

export type Categoria = { id: number; nome: string; cor: string };

export type FormaPagamento = {
  id: number;
  nome: string;
  diaValidade: number | null;
  diaFechamento: number | null;
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
