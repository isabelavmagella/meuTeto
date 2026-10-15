import { prisma } from "../lib/prisma.js";
import { Router } from "express";
import { autenticar } from "../middlewares/auth.js";
import { Tipo } from "../generated/prisma/enums.js";
import { inteiroPositivo } from "../utils/validacao.js";
import { dataNoMes, vencimentoPrimeiraParcela } from "../utils/datas.js";

const router = Router();

router.post("/", autenticar, async (req, res) => {
  const {
    tipo,
    valor,
    descricao,
    data,
    totalParcelas,
    categoryId,
    formaPagamentoId,
  } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  if (
    !tipo ||
    valor == null ||
    valor === "" ||
    !descricao?.trim() ||
    !data ||
    !categoryId ||
    !formaPagamentoId
  ) {
    return res
      .status(400)
      .json({ error: "Preencha todos os campos obrigatórios." });
  }

  if (!Object.values(Tipo).includes(tipo)) {
    return res.status(400).json({ error: "Tipo inválido" });
  }

  const valorNumero = Number(valor);
  if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
    return res.status(400).json({ error: "Valor inválido." });
  }

  const categoria = inteiroPositivo(categoryId);
  const formaPagamento = inteiroPositivo(formaPagamentoId);
  if (!categoria || !formaPagamento) {
    return res
      .status(400)
      .json({ error: "Categoria ou forma de pagamento inválida." });
  }

  const dataConvertida = new Date(data);
  if (isNaN(dataConvertida.getTime())) {
    return res.status(400).json({ error: "Data inválida." });
  }

  let parcelas = 1;
  if (totalParcelas != null && totalParcelas !== "") {
    const n = inteiroPositivo(totalParcelas);
    if (!n || n > 48) {
      return res.status(400).json({ error: "Número de parcelas inválido." });
    }
    parcelas = n;
  }

  const dadosBase = {
    tipo,
    valor: String(valor),
    descricao: descricao.trim(),
    data: dataConvertida,
    categoryId: categoria,
    formaPagamentoId: formaPagamento,
    userId,
  };

  try {
    const forma = await prisma.formaPagamento.findUnique({
      where: { id_userId: { id: formaPagamento, userId } },
    });

    if (!forma || !forma.ativo) {
      return res.status(400).json({ error: "Forma de pagamento inválida." });
    }

    if (parcelas === 1) {
      const transacao = await prisma.transaction.create({ data: dadosBase });
      return res.status(201).json(transacao);
    }

    const parcelamentoId = crypto.randomUUID();

    const transacoes = await prisma.$transaction(
      Array.from({ length: parcelas }, (_, i) =>
        prisma.transaction.create({
          data: {
            ...dadosBase,
            totalParcelas: parcelas,
            parcelamentoId,
            parcelaAtual: i + 1,
          },
        }),
      ),
    );

    return res.status(201).json(transacoes);
  } catch (err: any) {
    if (err?.code === "P2003") {
      return res
        .status(400)
        .json({ error: "Categoria ou forma de pagamento inválida." });
    }
    console.error(err);
    return res.status(500).json({ error: "Ocorreu um erro no servidor" });
  }
});

router.get("/", autenticar, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  try {
    const transacoes = await prisma.transaction.findMany({
      where: { userId },
      include: {
        formaPagamento: true,
        category: true,
      },
      orderBy: [{ data: "desc" }, { parcelaAtual: "asc" }],
    });

    const transacoesComVencimento = transacoes.map((t) => {
      const diaValidade = t.formaPagamento?.diaValidade;
      if (!diaValidade) {
        return { ...t, dataVencimento: null };
      }

      const venc1 = vencimentoPrimeiraParcela(
        t.data,
        diaValidade,
        t.formaPagamento.diaFechamento,
      );
      const deslocamento = (t.parcelaAtual ?? 1) - 1;

      return {
        ...t,
        dataVencimento: dataNoMes(venc1, deslocamento, diaValidade),
      };
    });

    return res.json(transacoesComVencimento);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar transações." });
  }
});

export default router;
