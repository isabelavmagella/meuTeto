import { Router } from "express";
import { autenticar } from "../middlewares/auth.js";
import { prisma } from "../lib/prisma.js";
import { erroPrisma } from "../utils/erros.js";
import { inteiroPositivo } from "../utils/validacao.js";

const MSG_CATEGORIA_DUPLICADO =
  "Já existe uma categoria com esse nome ou essa cor (pode estar arquivada).";

const router = Router();

router.post("/", autenticar, async (req, res) => {
  const { nome, cor } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const nomeLimpo = typeof nome === "string" ? nome.trim() : "";
  const corLimpa = typeof cor === "string" ? cor.trim() : "";
  if (!nomeLimpo || !corLimpa) {
    return res
      .status(400)
      .json({ error: "Preencha todos os campos obrigatórios." });
  }

  try {
    const arquivada = await prisma.category.findUnique({
      where: { nome_userId: { nome: nomeLimpo, userId } },
    });

    if (arquivada && !arquivada.ativo) {
      const reativada = await prisma.category.update({
        where: { id: arquivada.id },
        data: {
          ativo: true,
          cor: corLimpa,
        },
      });
      return res.status(201).json(reativada);
    }

    const categoria = await prisma.category.create({
      data: {
        nome: nomeLimpo,
        cor: corLimpa,
        userId,
      },
    });

    return res.status(201).json(categoria);
  } catch (err) {
    const conhecido = erroPrisma(err, MSG_CATEGORIA_DUPLICADO);
    if (conhecido)
      return res.status(conhecido.status).json({ error: conhecido.error });
    console.error(err);
    return res.status(500).json({ error: "Erro ao cadastrar categoria." });
  }
});

router.delete("/:id", autenticar, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Categoria inválida." });
  }

  try {
    const existe = await prisma.category.findUnique({
      where: { id_userId: { id, userId } },
    });

    if (!existe) {
      return res.status(404).json({ error: "Categoria não encontrada." });
    }

    await prisma.category.update({
      where: { id_userId: { id, userId } },
      data: { ativo: false },
    });

    return res.status(204).send();
  } catch (err) {
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
    const categorias = await prisma.category.findMany({
      where: { userId, ativo: true },
      orderBy: {
        nome: "asc",
      },
    });

    return res.json(categorias);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Ocorreu um erro no servidor." });
  }
});

router.put("/:id", autenticar, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user?.id;
  const { nome, cor } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Categoria inválida." });
  }

  const nomeLimpo = typeof nome === "string" ? nome.trim() : "";
  const corLimpa = typeof cor === "string" ? cor.trim() : "";
  if (!nomeLimpo || !corLimpa) {
    return res
      .status(400)
      .json({ error: "Preencha todos os campos obrigatórios." });
  }

  try {
    const existe = await prisma.category.findUnique({
      where: { id_userId: { id, userId } },
    });

    if (!existe || !existe.ativo) {
      return res.status(404).json({ error: "Categoria não encontrada." });
    }

    const categoriaAtualizada = await prisma.category.update({
      where: { id_userId: { id, userId } },
      data: {
        nome: nomeLimpo,
        cor: corLimpa,
      },
    });

    return res.status(200).json(categoriaAtualizada);
  } catch (err) {
    const conhecido = erroPrisma(err, MSG_CATEGORIA_DUPLICADO);
    if (conhecido)
      return res.status(conhecido.status).json({ error: conhecido.error });
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
      .json({ error: "Selecione as categorias a excluir." });
  }

  const idsValidos = [...new Set(ids.map(inteiroPositivo))];
  if (idsValidos.some((id) => !id)) {
    return res.status(400).json({ error: "Categoria inválida." });
  }

  try {
    const { count } = await prisma.category.updateMany({
      where: {
        userId,
        id: { in: idsValidos as number[] },
      },
      data: {
        ativo: false,
      },
    });

    return res.json({ excluidas: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Ocorreu um erro no servidor" });
  }
});

export default router;
