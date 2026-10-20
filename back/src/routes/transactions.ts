import { prisma } from "../lib/prisma.js";
import { Router } from "express";
import { autenticar } from "../middlewares/auth.js";
import { Tipo } from "../generated/prisma/enums.js";
import { inteiroPositivo, mesmoDia } from "../utils/validacao.js";
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
    typeof descricao !== "string" ||
    !descricao.trim() ||
    !data ||
    !categoryId
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
  if (!categoria) {
    return res.status(400).json({ error: "Categoria inválida." });
  }

  let formaPagamento: number | null = null;
  if (formaPagamentoId != null && formaPagamentoId !== "") {
    formaPagamento = inteiroPositivo(formaPagamentoId);
    if (!formaPagamento) {
      return res.status(400).json({ error: "Forma de pagamento inválida." });
    }
  } else if (tipo === Tipo.DESPESA) {
    return res.status(400).json({ error: "Informe a forma de pagamento." });
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
    const formaExiste = formaPagamento
      ? await prisma.formaPagamento.findUnique({
          where: { id_userId: { id: formaPagamento, userId } },
        })
      : null;

    if (formaPagamento && (!formaExiste || !formaExiste.ativo)) {
      return res.status(400).json({ error: "Forma de pagamento inválida." });
    }

    const diaValidade = formaExiste?.diaValidade ?? null;
    const venc1 = diaValidade
      ? vencimentoPrimeiraParcela(
          dataConvertida,
          diaValidade,
          formaExiste!.diaFechamento,
        )
      : null;

    const vencimentoDaParcela = (i: number) =>
      venc1 ? dataNoMes(venc1, i, diaValidade!) : null;

    const categoriaExiste = await prisma.category.findUnique({
      where: { id_userId: { id: categoria, userId } },
    });

    if (!categoriaExiste || !categoriaExiste.ativo) {
      return res.status(400).json({ error: "Categoria inválida." });
    }

    if (parcelas === 1) {
      const transacao = await prisma.transaction.create({
        data: { ...dadosBase, dataVencimento: vencimentoDaParcela(0) },
      });
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
            dataVencimento: vencimentoDaParcela(i),
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
  const {
    mes: mesParam,
    tipo: tipoParam,
    categoria: categoryParam,
    por: porParam,
  } = req.query;

  const por = porParam ?? "compra";
  if (por !== "compra" && por !== "vencimento") {
    return res.status(400).json({ error: "Filtro de data inválido." });
  }

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const filtro: any = { userId };

  if (mesParam) {
    const mes = Number(String(mesParam).slice(5));
    const ano = Number(String(mesParam).slice(0, 4));

    const diasNoMes = new Date(ano, mes, 0).getDate();
    const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1));
    const ultimoDia = new Date(
      Date.UTC(ano, mes - 1, diasNoMes, 23, 59, 59, 999),
    );
    const intervalo = { gte: primeiroDia, lte: ultimoDia };

    if (por === "compra") {
      filtro.data = intervalo;
    } else {
      filtro.OR = [
        { dataVencimento: intervalo },
        { dataVencimento: null, data: intervalo },
      ];
    }
  }

  if (tipoParam) {
    if (!Object.values(Tipo).includes(tipoParam as Tipo)) {
      return res.status(400).json({ error: "Tipo inválido." });
    }
    filtro.tipo = tipoParam as Tipo;
  }

  try {
    if (categoryParam) {
      const cat = await prisma.category.findUnique({
        where: { id_userId: { id: Number(categoryParam), userId } },
      });
      if (!cat) {
        return res.status(400).json({ error: "Categoria inválida." });
      }
      filtro.categoryId = Number(categoryParam);
    }

    const transacoes = await prisma.transaction.findMany({
      where: filtro,
      include: {
        formaPagamento: true,
        category: true,
      },
      orderBy:
        por === "vencimento"
          ? [{ dataVencimento: "asc" }, { data: "asc" }]
          : [{ createdAt: "desc" }, { parcelaAtual: "asc" }],
    });

    return res.json(transacoes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar transações." });
  }
});

router.delete("/:id", autenticar, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const id = inteiroPositivo(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Transação inválida." });
  }

  try {
    const transacaoApagar = await prisma.transaction.findFirst({
      where: { id, userId },
      select: { parcelamentoId: true },
    });

    if (!transacaoApagar) {
      return res.status(404).json({ error: "Transação não encontrada." });
    }

    await prisma.transaction.deleteMany({
      where: transacaoApagar.parcelamentoId
        ? { parcelamentoId: transacaoApagar.parcelamentoId, userId }
        : { id, userId },
    });

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Ocorreu um erro no servidor" });
  }
});

router.put("/:id", autenticar, async (req, res) => {
  const {
    tipo,
    valor,
    descricao,
    data,
    categoryId,
    formaPagamentoId,
    totalParcelas,
  } = req.body;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const id = inteiroPositivo(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Transação inválida." });
  }

  if (
    !tipo ||
    valor == null ||
    valor === "" ||
    typeof descricao !== "string" ||
    !descricao.trim() ||
    !data ||
    !categoryId
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
  if (!categoria) {
    return res.status(400).json({ error: "Categoria inválida." });
  }

  let formaPagamento: number | null = null;
  if (formaPagamentoId != null && formaPagamentoId !== "") {
    formaPagamento = inteiroPositivo(formaPagamentoId);
    if (!formaPagamento) {
      return res.status(400).json({ error: "Forma de pagamento inválida." });
    }
  } else if (tipo === Tipo.DESPESA) {
    return res.status(400).json({ error: "Informe a forma de pagamento." });
  }

  const dataConvertida = new Date(data);
  if (isNaN(dataConvertida.getTime())) {
    return res.status(400).json({ error: "Data inválida." });
  }

  try {
    const atual = await prisma.transaction.findFirst({
      where: { id, userId },
      select: {
        parcelamentoId: true,
        totalParcelas: true,
        data: true,
        formaPagamentoId: true,
        categoryId: true,
      },
    });

    if (!atual) {
      return res.status(404).json({ error: "Transação não encontrada." });
    }

    if (
      totalParcelas != null &&
      totalParcelas !== "" &&
      inteiroPositivo(totalParcelas) !== (atual.totalParcelas ?? 1)
    ) {
      return res.status(400).json({
        error:
          "Não é possível alterar o número de parcelas. Exclua e lance novamente.",
      });
    }

    const mudouForma = formaPagamento !== atual.formaPagamentoId;
    const mudouCategoria = categoria !== atual.categoryId;
    const mudouData = !mesmoDia(dataConvertida, atual.data);

    const forma = formaPagamento
      ? await prisma.formaPagamento.findUnique({
          where: { id_userId: { id: formaPagamento, userId } },
        })
      : null;
    if (formaPagamento && (!forma || (mudouForma && !forma.ativo))) {
      return res.status(400).json({ error: "Forma de pagamento inválida." });
    }

    const cat = await prisma.category.findUnique({
      where: { id_userId: { id: categoria, userId } },
    });
    if (!cat || (mudouCategoria && !cat.ativo)) {
      return res.status(400).json({ error: "Categoria inválida." });
    }

    const where = atual.parcelamentoId
      ? { parcelamentoId: atual.parcelamentoId, userId }
      : { id, userId };

    const dadosComuns = {
      tipo,
      valor: String(valor),
      descricao: descricao.trim(),
      data: dataConvertida,
      categoryId: categoria,
      formaPagamentoId: formaPagamento,
    };

    if (!mudouForma && !mudouData) {
      await prisma.transaction.updateMany({ where, data: dadosComuns });
    } else {
      const parcelas = await prisma.transaction.findMany({
        where,
        select: { id: true, parcelaAtual: true },
      });

      const dia = forma?.diaValidade ?? null;
      const venc1 = dia
        ? vencimentoPrimeiraParcela(dataConvertida, dia, forma!.diaFechamento)
        : null;

      await prisma.$transaction(
        parcelas.map((p) =>
          prisma.transaction.update({
            where: { id: p.id },
            data: {
              ...dadosComuns,
              dataVencimento: venc1
                ? dataNoMes(venc1, (p.parcelaAtual ?? 1) - 1, dia!)
                : null,
            },
          }),
        ),
      );
    }

    const atualizadas = await prisma.transaction.findMany({
      where,
      include: { formaPagamento: true, category: true },
      orderBy: { parcelaAtual: "asc" },
    });

    return res.json(atualizadas);
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

export default router;
