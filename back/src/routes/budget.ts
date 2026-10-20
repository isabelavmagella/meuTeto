import { Router } from "express";
import { autenticar } from "../middlewares/auth.js";
import { inteiroPositivo } from "../utils/validacao.js";
import { prisma } from "../lib/prisma.js";
import { erroPrisma } from "../utils/erros.js";

const MSG_BUDGET_DUPLICADO =
  "Já existe um orçamento definido para esta categoria neste mês.";

const router = Router();

router.post("/", autenticar, async (req, res) => {
  const { mesAno, valorLimite, categoryId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  if (valorLimite == null || valorLimite === "" || !categoryId || !mesAno) {
    return res
      .status(400)
      .json({ error: "Preencha todos os campos obrigatórios." });
  }

  const valorNumero = Number(valorLimite);
  if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
    return res.status(400).json({ error: "Valor inválido." });
  }

  const categoria = inteiroPositivo(categoryId);
  if (!categoria) {
    return res.status(400).json({ error: "Categoria inválida." });
  }

  const partesMesAno = mesAno.split("-");
  if (partesMesAno.length !== 2) {
    return res
      .status(400)
      .json({ error: "Formato de mês/ano inválido. Use MM/YYYY." });
  }

  const [mes, ano] = partesMesAno.map(Number);
  if (!mes || !ano || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "Mês ou ano inválidos." });
  }

  const dataMes = new Date(ano, mes - 1, 1);

  try {
    const categoriaExiste = await prisma.category.findFirst({
      where: { id: categoria, userId },
    });

    if (!categoriaExiste) {
      return res.status(404).json({ error: "Categoria não encontrada." });
    }

    const budgetExistente = await prisma.budget.findUnique({
      where: {
        userId_mes_categoryId: {
          userId,
          mes: dataMes,
          categoryId: categoria,
        },
      },
    });

    if (budgetExistente) {
      return res.status(409).json({
        error: MSG_BUDGET_DUPLICADO,
      });
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: categoria,
        mes: dataMes,
        valorLimite: valorLimite,
      },
      include: { category: true },
    });

    return res.status(201).json(budget);
  } catch (err) {
    const conhecido = erroPrisma(err, MSG_BUDGET_DUPLICADO);
    if (conhecido)
      return res.status(conhecido.status).json({ error: conhecido.error });
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

router.get("/", autenticar, async (req, res) => {
  const { mesAno } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const filtro: { userId: number; mes?: Date } = { userId };

  if (mesAno && typeof mesAno === "string") {
    const partesMesAno = mesAno.split("-");
    if (partesMesAno.length !== 2) {
      return res
        .status(400)
        .json({ error: "Mês ou ano inválidos." });
    }

    const [mes, ano] = partesMesAno.map(Number);
    if (!mes || !ano || mes < 1 || mes > 12) {
      return res.status(400).json({ error: "Mês ou ano inválidos." });
    }

    filtro.mes = new Date(ano, mes - 1, 1);
  }

  try {
    const budgets = await prisma.budget.findMany({
      where: filtro,
      include: { category: true },
      orderBy: { mes: "desc" },
    });

    return res.json(budgets);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

router.put("/:id", autenticar, async (req, res) => {
  const { mesAno, valorLimite, categoryId } = req.body;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const id = inteiroPositivo(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Orçamento inválido." });
  }

  try {
    const budgetProprio = await prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!budgetProprio) {
      return res.status(404).json({ error: "Orçamento não encontrado." });
    }

    let valorNumero = Number(budgetProprio.valorLimite);
    if (valorLimite != null && valorLimite !== "") {
      valorNumero = Number(valorLimite);
      if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
        return res.status(400).json({ error: "Valor inválido." });
      }
    }

    let categoria = budgetProprio.categoryId;
    if (categoryId != null && categoryId !== "") {
      const cat = inteiroPositivo(categoryId);
      if (!cat) {
        return res.status(400).json({ error: "Categoria inválida." });
      }

      const categoriaExiste = await prisma.category.findFirst({
        where: { id: cat, userId },
      });

      if (!categoriaExiste) {
        return res.status(404).json({ error: "Categoria não encontrada." });
      }

      categoria = cat;
    }

    let dataMes = budgetProprio.mes;
    if (mesAno != null && mesAno !== "") {
      if (typeof mesAno !== "string") {
        return res.status(400).json({ error: "Mês ou ano inválidos." });
      }

      const partesMesAno = mesAno.split("-");
      if (partesMesAno.length !== 2) {
        return res
          .status(400)
          .json({ error: "Mês ou ano inválidos." });
      }

      const [mes, ano] = partesMesAno.map(Number);
      if (!mes || !ano || mes < 1 || mes > 12) {
        return res.status(400).json({ error: "Mês ou ano inválidos." });
      }

      dataMes = new Date(ano, mes - 1, 1);
    }

    const budgetExistente = await prisma.budget.findFirst({
      where: {
        userId,
        mes: dataMes,
        categoryId: categoria,
        NOT: { id },
      },
    });

    if (budgetExistente) {
      return res.status(409).json({
        error: MSG_BUDGET_DUPLICADO,
      });
    }

    const budgetAtualizado = await prisma.budget.update({
      where: { id },
      data: {
        valorLimite: valorNumero,
        categoryId: categoria,
        mes: dataMes,
      },
      include: { category: true },
    });

    return res.json(budgetAtualizado);
  } catch (err) {
    const conhecido = erroPrisma(err, MSG_BUDGET_DUPLICADO);
    if (conhecido)
      return res.status(conhecido.status).json({ error: conhecido.error });
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

router.delete("/:id", autenticar, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const id = inteiroPositivo(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Orçamento inválido." });
  }

  try {
    const budget = await prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado." });
    }

    await prisma.budget.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor." });
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
      .json({ error: "Selecione os orçamentos a excluir." });
  }

  const idsValidos = [...new Set(ids.map(inteiroPositivo))];
  if (idsValidos.some((id) => !id)) {
    return res.status(400).json({ error: "Orçamento inválido." });
  }

  try {
    const { count } = await prisma.budget.deleteMany({
      where: {
        userId,
        id: { in: idsValidos as number[] },
      },
    });

    return res.json({ excluidas: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Ocorreu um erro no servidor" });
  }
});

export default router;
