import { prisma } from "../lib/prisma.js";
import { Router } from "express";
import { autenticar } from "../middlewares/auth.js";
import { Tipo } from "../generated/prisma/enums.js";
import { inteiroPositivo, mesmoDia } from "../utils/validacao.js";
import { dataNoMes, vencimentoPrimeiraParcela } from "../utils/datas.js";

const MSG_PARCELA_SEM_VENCIMENTO =
  "Compras parceladas exigem uma forma de pagamento com dia de vencimento.";
const MSG_SUBCATEGORIA_INVALIDA = "Subcategoria inválida.";
const MSG_SUBCATEGORIA_SEM_CATEGORIA =
  "Informe a categoria para usar uma subcategoria.";
const MSG_SUBCATEGORIA_NAO_ENCONTRADA = "Subcategoria não encontrada.";
const MSG_SUBCATEGORIA_DE_OUTRA_CATEGORIA =
  "A subcategoria não pertence à categoria informada.";
const MSG_SUBCATEGORIA_REMOVIDA =
  "A subcategoria foi removida porque a categoria da transação mudou.";

const router = Router();

async function validarSubcategoria(
  id: number,
  categoria: number,
  userId: number,
  exigirAtiva: boolean,
) {
  const subcategoria = await prisma.subcategory.findUnique({
    where: { id_userId: { id, userId } },
  });
  if (!subcategoria || (exigirAtiva && !subcategoria.ativo)) {
    return { status: 404, error: MSG_SUBCATEGORIA_NAO_ENCONTRADA };
  }
  if (subcategoria.categoryId !== categoria) {
    return { status: 400, error: MSG_SUBCATEGORIA_DE_OUTRA_CATEGORIA };
  }
  return null;
}

router.post("/", autenticar, async (req, res) => {
  const {
    tipo,
    valor,
    descricao,
    data,
    totalParcelas,
    categoryId,
    subcategoryId,
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
    !data
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

  let categoria: number | null = null;
  if (categoryId != null && categoryId !== "") {
    categoria = inteiroPositivo(categoryId);
    if (!categoria) {
      return res.status(400).json({ error: "Categoria inválida." });
    }
  } else if (tipo === Tipo.DESPESA) {
    return res.status(400).json({ error: "Informe a categoria." });
  }

  let subcategoria: number | null = null;
  if (subcategoryId != null && subcategoryId !== "") {
    subcategoria = inteiroPositivo(subcategoryId);
    if (!subcategoria) {
      return res.status(400).json({ error: MSG_SUBCATEGORIA_INVALIDA });
    }
    if (!categoria) {
      return res.status(400).json({ error: MSG_SUBCATEGORIA_SEM_CATEGORIA });
    }
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
    subcategoryId: subcategoria,
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
    if (parcelas > 1 && !diaValidade) {
      return res.status(400).json({ error: MSG_PARCELA_SEM_VENCIMENTO });
    }

    const venc1 = diaValidade
      ? vencimentoPrimeiraParcela(
          dataConvertida,
          diaValidade,
          formaExiste!.diaFechamento,
        )
      : null;

    const vencimentoDaParcela = (i: number) =>
      venc1 ? dataNoMes(venc1, i, diaValidade!) : null;

    const categoriaExiste = categoria
      ? await prisma.category.findUnique({
          where: { id_userId: { id: categoria, userId } },
        })
      : null;

    if (categoria && (!categoriaExiste || !categoriaExiste.ativo)) {
      return res.status(400).json({ error: "Categoria inválida." });
    }

    if (subcategoria) {
      const erro = await validarSubcategoria(
        subcategoria,
        categoria!,
        userId,
        true,
      );
      if (erro) return res.status(erro.status).json({ error: erro.error });
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
    subcategoria: subcategoryParam,
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

    if (subcategoryParam) {
      const subcategoria = inteiroPositivo(subcategoryParam);
      const sub = subcategoria
        ? await prisma.subcategory.findUnique({
            where: { id_userId: { id: subcategoria, userId } },
          })
        : null;
      if (!sub) {
        return res.status(400).json({ error: MSG_SUBCATEGORIA_INVALIDA });
      }
      filtro.subcategoryId = sub.id;
    }

    const transacoes = await prisma.transaction.findMany({
      where: filtro,
      include: {
        formaPagamento: true,
        category: true,
        subcategory: true,
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
    subcategoryId,
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
    !data
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

  let categoria: number | null = null;
  if (categoryId != null && categoryId !== "") {
    categoria = inteiroPositivo(categoryId);
    if (!categoria) {
      return res.status(400).json({ error: "Categoria inválida." });
    }
  } else if (tipo === Tipo.DESPESA) {
    return res.status(400).json({ error: "Informe a categoria." });
  }

  let subcategoria: number | null | undefined;
  if (subcategoryId === null || subcategoryId === "") {
    subcategoria = null;
  } else if (subcategoryId !== undefined) {
    const n = inteiroPositivo(subcategoryId);
    if (!n) {
      return res.status(400).json({ error: MSG_SUBCATEGORIA_INVALIDA });
    }
    if (!categoria) {
      return res.status(400).json({ error: MSG_SUBCATEGORIA_SEM_CATEGORIA });
    }
    subcategoria = n;
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
        subcategoryId: true,
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
    if (atual.parcelamentoId && mudouForma && !forma?.diaValidade) {
      return res.status(400).json({ error: MSG_PARCELA_SEM_VENCIMENTO });
    }

    const cat = categoria
      ? await prisma.category.findUnique({
          where: { id_userId: { id: categoria, userId } },
        })
      : null;
    if (categoria && (!cat || (mudouCategoria && !cat.ativo))) {
      return res.status(400).json({ error: "Categoria inválida." });
    }

    let subcategoriaFinal = atual.subcategoryId;
    let aviso: string | undefined;
    if (subcategoria !== undefined) {
      subcategoriaFinal = subcategoria;
    } else if (mudouCategoria && atual.subcategoryId !== null) {
      subcategoriaFinal = null;
      aviso = MSG_SUBCATEGORIA_REMOVIDA;
    }

    if (subcategoria) {
      const erro = await validarSubcategoria(
        subcategoria,
        categoria!,
        userId,
        subcategoria !== atual.subcategoryId,
      );
      if (erro) return res.status(erro.status).json({ error: erro.error });
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
      subcategoryId: subcategoriaFinal,
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
      include: { formaPagamento: true, category: true, subcategory: true },
      orderBy: { parcelaAtual: "asc" },
    });

    return res.json(
      aviso ? atualizadas.map((t) => ({ ...t, aviso })) : atualizadas,
    );
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

router.delete("/", autenticar, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) {
    return res
      .status(400)
      .json({ error: "Selecione as transações a excluir." });
  }

  const idsValidos = [...new Set(ids.map(inteiroPositivo))];
  if (idsValidos.some((id) => !id)) {
    return res.status(400).json({ error: "Transação inválida." });
  }

  try {
    const selecionadas = await prisma.transaction.findMany({
      where: { id: { in: idsValidos as number[] }, userId },
      select: { parcelamentoId: true },
    });

    const parcelamentos = [
      ...new Set(
        selecionadas
          .map((t) => t.parcelamentoId)
          .filter((p): p is string => p !== null),
      ),
    ];

    const { count } = await prisma.transaction.deleteMany({
      where: {
        userId,
        OR: [
          { id: { in: idsValidos as number[] } },
          { parcelamentoId: { in: parcelamentos } },
        ],
      },
    });

    return res.json({ excluidas: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Ocorreu um erro no servidor" });
  }
});

export default router;
