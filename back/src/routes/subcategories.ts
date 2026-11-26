import { Router } from "express";
import { autenticar } from "../middlewares/auth.js";
import { limitarDemo } from "../middlewares/limitesDemo.js";
import { prisma } from "../lib/prisma.js";
import { erroPrisma } from "../utils/erros.js";
import { inteiroPositivo, normalizarNome } from "../utils/validacao.js";

const MSG_SUBCATEGORIA_DUPLICADO =
  "Já existe uma subcategoria com esse nome nesta categoria (pode estar arquivada).";
const MSG_SUBCATEGORIA_INVALIDA = "Subcategoria inválida.";
const MSG_SUBCATEGORIA_NAO_ENCONTRADA = "Subcategoria não encontrada.";
const MSG_CATEGORIA_INVALIDA = "Categoria inválida.";
const MSG_CATEGORIA_NAO_ENCONTRADA = "Categoria não encontrada.";
const MSG_ERRO_INTERNO = "Erro interno no servidor.";

const router = Router();

function comCor<T extends { category: { cor: string } }>(subcategoria: T) {
  return { ...subcategoria, cor: subcategoria.category.cor };
}

async function categoriaAtiva(id: number, userId: number) {
  const categoria = await prisma.category.findUnique({
    where: { id_userId: { id, userId } },
  });
  return categoria?.ativo ? categoria : null;
}

router.post("/", autenticar, limitarDemo("subcategorias"), async (req, res) => {
  const { nome, categoryId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const nomeLimpo = typeof nome === "string" ? nome.trim() : "";
  if (!nomeLimpo || categoryId == null || categoryId === "") {
    return res
      .status(400)
      .json({ error: "Preencha todos os campos obrigatórios." });
  }

  const categoria = inteiroPositivo(categoryId);
  if (!categoria) {
    return res.status(400).json({ error: MSG_CATEGORIA_INVALIDA });
  }

  const nomeNormalizado = normalizarNome(nomeLimpo);

  try {
    if (!(await categoriaAtiva(categoria, userId))) {
      return res.status(404).json({ error: MSG_CATEGORIA_NAO_ENCONTRADA });
    }

    const arquivada = await prisma.subcategory.findUnique({
      where: {
        userId_categoryId_nomeNormalizado: {
          userId,
          categoryId: categoria,
          nomeNormalizado,
        },
      },
    });

    if (arquivada && !arquivada.ativo) {
      const reativada = await prisma.subcategory.update({
        where: { id: arquivada.id },
        data: { ativo: true, nome: nomeLimpo },
        include: { category: true },
      });
      return res.status(201).json(comCor(reativada));
    }

    const subcategoria = await prisma.subcategory.create({
      data: {
        nome: nomeLimpo,
        nomeNormalizado,
        categoryId: categoria,
        userId,
      },
      include: { category: true },
    });

    return res.status(201).json(comCor(subcategoria));
  } catch (err) {
    const conhecido = erroPrisma(err, MSG_SUBCATEGORIA_DUPLICADO);
    if (conhecido)
      return res.status(conhecido.status).json({ error: conhecido.error });
    console.error(err);
    return res.status(500).json({ error: MSG_ERRO_INTERNO });
  }
});

router.get("/", autenticar, async (req, res) => {
  const userId = req.user?.id;
  const { categoryId } = req.query;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const filtro: { userId: number; ativo: boolean; categoryId?: number } = {
    userId,
    ativo: true,
  };

  if (categoryId !== undefined) {
    const categoria = inteiroPositivo(categoryId);
    if (!categoria) {
      return res.status(400).json({ error: MSG_CATEGORIA_INVALIDA });
    }
    filtro.categoryId = categoria;
  }

  try {
    const subcategorias = await prisma.subcategory.findMany({
      where: filtro,
      include: { category: true },
      orderBy: {
        nome: "asc",
      },
    });

    return res.json(subcategorias.map(comCor));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: MSG_ERRO_INTERNO });
  }
});

router.put("/:id", autenticar, limitarDemo(), async (req, res) => {
  const id = inteiroPositivo(req.params.id);
  const userId = req.user?.id;
  const { nome, categoryId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  if (!id) {
    return res.status(400).json({ error: MSG_SUBCATEGORIA_INVALIDA });
  }

  if (nome === undefined && categoryId === undefined) {
    return res
      .status(400)
      .json({ error: "Informe o nome ou a categoria da subcategoria." });
  }

  const dados: { nome?: string; nomeNormalizado?: string; categoryId?: number } =
    {};

  if (nome !== undefined) {
    const nomeLimpo = typeof nome === "string" ? nome.trim() : "";
    if (!nomeLimpo) {
      return res
        .status(400)
        .json({ error: "Preencha todos os campos obrigatórios." });
    }
    dados.nome = nomeLimpo;
    dados.nomeNormalizado = normalizarNome(nomeLimpo);
  }

  if (categoryId !== undefined) {
    const categoria = inteiroPositivo(categoryId);
    if (!categoria) {
      return res.status(400).json({ error: MSG_CATEGORIA_INVALIDA });
    }
    dados.categoryId = categoria;
  }

  try {
    const existe = await prisma.subcategory.findUnique({
      where: { id_userId: { id, userId } },
    });

    if (!existe || !existe.ativo) {
      return res.status(404).json({ error: MSG_SUBCATEGORIA_NAO_ENCONTRADA });
    }

    const novaCategoria =
      dados.categoryId !== undefined && dados.categoryId !== existe.categoryId
        ? dados.categoryId
        : null;

    if (novaCategoria && !(await categoriaAtiva(novaCategoria, userId))) {
      return res.status(404).json({ error: MSG_CATEGORIA_NAO_ENCONTRADA });
    }

    const atualizarSubcategoria = prisma.subcategory.update({
      where: { id_userId: { id, userId } },
      data: dados,
      include: { category: true },
    });

    if (!novaCategoria) {
      const subcategoriaAtualizada = await atualizarSubcategoria;
      return res.status(200).json(comCor(subcategoriaAtualizada));
    }

    // Transações e recorrências que usam a subcategoria acompanham a nova
    // categoria; senão as próximas transações geradas nasceriam com uma
    // subcategoria de outra categoria, e a recorrência não poderia ser editada.
    const [subcategoriaAtualizada, { count }] = await prisma.$transaction([
      atualizarSubcategoria,
      prisma.transaction.updateMany({
        where: { subcategoryId: id, userId },
        data: { categoryId: novaCategoria },
      }),
      prisma.transacaoRecorrente.updateMany({
        where: { subcategoryId: id, userId },
        data: { categoryId: novaCategoria },
      }),
    ]);

    return res.status(200).json({
      ...comCor(subcategoriaAtualizada),
      transacoesAtualizadas: count,
    });
  } catch (err) {
    const conhecido = erroPrisma(err, MSG_SUBCATEGORIA_DUPLICADO);
    if (conhecido)
      return res.status(conhecido.status).json({ error: conhecido.error });
    console.error(err);
    return res.status(500).json({ error: MSG_ERRO_INTERNO });
  }
});

router.delete("/:id", autenticar, async (req, res) => {
  const id = inteiroPositivo(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  if (!id) {
    return res.status(400).json({ error: MSG_SUBCATEGORIA_INVALIDA });
  }

  try {
    const existe = await prisma.subcategory.findUnique({
      where: { id_userId: { id, userId } },
    });

    if (!existe) {
      return res.status(404).json({ error: MSG_SUBCATEGORIA_NAO_ENCONTRADA });
    }

    await prisma.subcategory.update({
      where: { id_userId: { id, userId } },
      data: { ativo: false },
    });

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: MSG_ERRO_INTERNO });
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
      .json({ error: "Selecione as subcategorias a excluir." });
  }

  const idsValidos = [...new Set(ids.map(inteiroPositivo))];
  if (idsValidos.some((id) => !id)) {
    return res.status(400).json({ error: MSG_SUBCATEGORIA_INVALIDA });
  }

  try {
    const { count } = await prisma.subcategory.updateMany({
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
    return res.status(500).json({ error: MSG_ERRO_INTERNO });
  }
});

export default router;
