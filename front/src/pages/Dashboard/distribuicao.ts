import type { GastoCategoria } from "./api";

export const OPACIDADES = [1, 0.75, 0.55, 0.4];
export const NOME_SEM_SUBCATEGORIA = "Sem subcategoria";
export const COR_SEM_SUBCATEGORIA = "var(--border-strong)";

export type Fatia = {
  chave: string;
  nome: string;
  valor: number;
  // Em relação ao total da visão (geral ou da categoria), de 0 a 100.
  percentual: number;
  cor: string;
  opacidade: number;
  semSubcategoria: boolean;
};

export type Distribuicao = { total: number; fatias: Fatia[] };

// Tudo em centavos inteiros pra soma das fatias bater exatamente com o total.
function centavos(valor: number) {
  return Math.round(valor * 100);
}

function percentualDe(parte: number, total: number) {
  return total > 0 ? (parte / total) * 100 : 0;
}

export function opacidadeDaPosicao(posicao: number) {
  return OPACIDADES[Math.min(posicao, OPACIDADES.length - 1)];
}

export function distribuicaoGeral(
  categorias: GastoCategoria[],
  totalDespesa: number,
): Distribuicao {
  const totalCent = centavos(totalDespesa);
  const fatias = categorias
    .map((c) => ({ c, cent: centavos(c.valor) }))
    .filter(({ cent }) => cent > 0)
    .sort((a, b) => b.cent - a.cent)
    .map(({ c, cent }) => ({
      chave: c.nome,
      nome: c.nome,
      valor: cent / 100,
      percentual: percentualDe(cent, totalCent),
      cor: c.cor,
      opacidade: 1,
      semSubcategoria: false,
    }));
  return { total: totalCent / 100, fatias };
}

export function distribuicaoDaCategoria(
  categoria: GastoCategoria,
): Distribuicao {
  const totalCent = centavos(categoria.valor);
  if (totalCent <= 0) return { total: 0, fatias: [] };

  const subs = categoria.subcategorias
    .map((s) => ({ s, cent: centavos(s.valor) }))
    .filter(({ cent }) => cent > 0)
    .sort((a, b) => b.cent - a.cent || a.s.nome.localeCompare(b.s.nome));

  const fatias: Fatia[] = subs.map(({ s, cent }, i) => ({
    chave: `sub-${s.id}`,
    nome: s.nome,
    valor: cent / 100,
    percentual: percentualDe(cent, totalCent),
    cor: categoria.cor,
    opacidade: opacidadeDaPosicao(i),
    semSubcategoria: false,
  }));

  const semCent = totalCent - subs.reduce((soma, { cent }) => soma + cent, 0);
  if (semCent > 0) {
    fatias.push({
      chave: "sem-subcategoria",
      nome: NOME_SEM_SUBCATEGORIA,
      valor: semCent / 100,
      percentual: percentualDe(semCent, totalCent),
      cor: COR_SEM_SUBCATEGORIA,
      opacidade: 1,
      semSubcategoria: true,
    });
  }

  return { total: totalCent / 100, fatias };
}
