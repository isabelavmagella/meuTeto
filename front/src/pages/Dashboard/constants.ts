import type { Mes, ResumoMensal } from "./api";
import { capitalizar } from "./formatadores";

const NOMES_MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export const HISTORICO_VAZIO: Mes[] = NOMES_MESES.map((nomeMes, i) => ({
  numeroMes: i + 1,
  nomeMes,
  receita: 0,
  despesa: 0,
  saldoFinal: 0,
}));

export const RESUMO_VAZIO: ResumoMensal = {
  kpis: {
    receita: { valor: 0, totalReceitaMesAnterior: 0, diferencaPorcentagem: 0 },
    despesa: { valor: 0, totalDespesaMesAnterior: 0, diferencaPorcentagem: 0 },
    saldo: { valor: 0, saldoFinalMesAnterior: 0, diferencaPorcentagem: 0 },
  },
  despesaPorCategoria: [],
  comparacaoOrcamento: [],
};

export const PERIODOS = Array.from({ length: 12 }, (_, i) => {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1);
  const nome = d.toLocaleDateString("pt-BR", { month: "long" });
  return {
    valor: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    rotulo: `${capitalizar(nome)} de ${d.getFullYear()}`,
  };
});

export const ALTURA_GRAFICO = 210;
export const MARGEM_GRAFICO = { top: 24, right: 8, bottom: 0, left: 0 };
export const LARGURA_EIXO_Y = 68;
