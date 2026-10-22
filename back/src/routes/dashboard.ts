import { Router } from "express";
import { autenticar } from "../middlewares/auth.js";
import { prisma } from "../lib/prisma.js";
import { primeiroDiaDoMes } from "../utils/datas.js";

const MSG_MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM.";

const router = Router();

function porVencimento(gte: Date, lt: Date) {
  const intervalo = { gte, lt };
  return {
    OR: [
      { dataVencimento: intervalo },
      { dataVencimento: null, data: intervalo },
    ],
  };
}

router.get("/monthly-summary", autenticar, async (req, res) => {
  const { mesAno } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  if (!mesAno || typeof mesAno !== "string") {
    return res
      .status(400)
      .json({ error: 'O parâmetro "mesAno" (AAAA-MM) é obrigatório.' });
  }

  const primeiroDia = primeiroDiaDoMes(mesAno);
  if (!primeiroDia) {
    return res.status(400).json({ error: MSG_MES_INVALIDO });
  }

  const ano = primeiroDia.getUTCFullYear();
  const mes = primeiroDia.getUTCMonth();
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 1));

  const primeiroDiaMesAnterior = new Date(Date.UTC(ano, mes - 1, 1));
  const ultimoDiaMesAnterior = primeiroDia;

  try {
    const [transacoes, transacoesMesAnterior, orcamentos] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, ...porVencimento(primeiroDia, ultimoDia) },
        include: { category: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          ...porVencimento(primeiroDiaMesAnterior, ultimoDiaMesAnterior),
        },
      }),
      prisma.budget.findMany({
        where: { userId, mes: primeiroDia },
        include: { category: true },
      }),
    ]);

    let totalReceita = 0;
    let totalDespesa = 0;
    const gastosCategoria: {
      [key: string]: { nome: string; cor: string; valor: number };
    } = {};

    transacoes.forEach((t) => {
      const valorNum = Number(t.valor);
      if (t.tipo === "RECEITA") {
        totalReceita += valorNum;
      } else if (t.tipo === "DESPESA") {
        totalDespesa += valorNum;
        if (!t.category) return;

        const catNome = t.category.nome;
        if (!gastosCategoria[catNome]) {
          gastosCategoria[catNome] = {
            nome: catNome,
            cor: t.category.cor,
            valor: 0,
          };
        }
        gastosCategoria[catNome].valor += valorNum;
      }
    });

    const saldoFinal = totalReceita - totalDespesa;

    let totalReceitaMesAnterior = 0;
    let totalDespesaMesAnterior = 0;
    transacoesMesAnterior.forEach((t) => {
      const valorNum = Number(t.valor);
      if (t.tipo === "RECEITA") totalReceitaMesAnterior += valorNum;
      if (t.tipo === "DESPESA") totalDespesaMesAnterior += valorNum;
    });
    const saldoFinalMesAnterior =
      totalReceitaMesAnterior - totalDespesaMesAnterior;

    const calcPercentual = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
      return Number(
        (((current - previous) / Math.abs(previous)) * 100).toFixed(1),
      );
    };

    const despesaPorCategoria = Object.values(gastosCategoria).sort(
      (a, b) => b.valor - a.valor,
    );

    const comparacaoOrcamento = orcamentos.map((b) => {
      const gasto = gastosCategoria[b.category.nome]?.valor || 0;
      const limite = Number(b.valorLimite);
      const porcentagem =
        limite > 0 ? Number(((gasto / limite) * 100).toFixed(1)) : 0;

      return {
        nomeCategoria: b.category.nome,
        corCategoria: b.category.cor,
        limiteOrcamento: limite,
        valorGasto: gasto,
        porcentagemUsada: porcentagem,
        ultrapassou: gasto > limite,
      };
    });

    return res.json({
      kpis: {
        receita: {
          valor: totalReceita,
          totalReceitaMesAnterior,
          diferencaPorcentagem: calcPercentual(
            totalReceita,
            totalReceitaMesAnterior,
          ),
        },
        despesa: {
          valor: totalDespesa,
          totalDespesaMesAnterior,
          diferencaPorcentagem: calcPercentual(
            totalDespesa,
            totalDespesaMesAnterior,
          ),
        },
        saldo: {
          valor: saldoFinal,
          saldoFinalMesAnterior,
          diferencaPorcentagem: calcPercentual(
            saldoFinal,
            saldoFinalMesAnterior,
          ),
        },
      },
      despesaPorCategoria,
      comparacaoOrcamento,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

router.get("/historical-trends", autenticar, async (req, res) => {
  const { ano } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const a = Number(ano);
  if (!Number.isInteger(a) || a < 2000 || a > 2100) {
    return res.status(400).json({ error: "Ano inválido." });
  }

  const dataInicial = new Date(Date.UTC(a, 0, 1));
  const dataFinal = new Date(Date.UTC(a + 1, 0, 1));

  try {
    const transacoes = await prisma.transaction.findMany({
      where: { userId, ...porVencimento(dataInicial, dataFinal) },
    });

    const dadosMensais: {
      [key: number]: { receita: number; despesa: number };
    } = {};
    for (let i = 0; i < 12; i++) {
      dadosMensais[i] = { receita: 0, despesa: 0 };
    }

    transacoes.forEach((t) => {
      const indexMes = (t.dataVencimento ?? t.data).getUTCMonth();
      const valor = Number(t.valor);

      if (t.tipo === "RECEITA") {
        dadosMensais[indexMes]!.receita += valor;
      } else if (t.tipo === "DESPESA") {
        dadosMensais[indexMes]!.despesa += valor;
      }
    });

    const nomesMeses = [
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

    const historico = nomesMeses.map((nome, index) => {
      const receita = dadosMensais[index]!.receita;
      const despesa = dadosMensais[index]!.despesa;
      const saldoFinal = receita - despesa;

      return {
        numeroMes: index + 1,
        nomeMes: nome,
        receita,
        despesa,
        saldoFinal,
      };
    });

    return res.json({ ano: a, historico });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

export default router;
