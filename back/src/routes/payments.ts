import { Router } from "express";
import { autenticar } from "../middlewares/auth.js";
import { inteiroPositivo, validarDiasCartao } from "../utils/validacao.js";
import { prisma } from "../lib/prisma.js";
import { erroPrisma } from "../utils/erros.js";

const MSG_NOME_DUPLICADO =
  "Já existe uma forma de pagamento com esse nome (pode estar arquivada).";

const router = Router();

router.post("/", autenticar, async (req, res) => {
  const { nome, diaValidade, diaFechamento } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const nomeLimpo = typeof nome === "string" ? nome.trim() : "";
  if (!nomeLimpo) {
    return res
      .status(400)
      .json({ error: "Preencha todos os campos obrigatórios." });
  }

  const dias = validarDiasCartao(diaValidade, diaFechamento);
  if (!dias.ok) {
    return res.status(400).json({ error: dias.error });
  }

  try {
    const arquivada = await prisma.formaPagamento.findUnique({
      where: { nome_userId: { nome: nomeLimpo, userId } },
    });

    if (arquivada && !arquivada.ativo) {
      const reativada = await prisma.formaPagamento.update({
        where: { id: arquivada.id },
        data: {
          ativo: true,
          diaValidade: dias.diaValidade,
          diaFechamento: dias.diaFechamento,
        },
      });
      return res.status(201).json(reativada);
    }

    const formaPagamento = await prisma.formaPagamento.create({
      data: {
        nome: nomeLimpo,
        diaValidade: dias.diaValidade,
        diaFechamento: dias.diaFechamento,
        userId,
      },
    });

    return res.status(201).json(formaPagamento);
  } catch (err) {
    const conhecido = erroPrisma(err, MSG_NOME_DUPLICADO);
    if (conhecido)
      return res.status(conhecido.status).json({ error: conhecido.error });
    console.error(err);
    return res
      .status(500)
      .json({ error: "Erro ao cadastrar forma de pagamento" });
  }
});

router.delete("/:id", autenticar, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user?.id;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Forma de pagamento inválida." });
  }

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  try {
    const existe = await prisma.formaPagamento.findUnique({
      where: { id_userId: { id, userId } },
    });

    if (!existe) {
      return res
        .status(404)
        .json({ error: "Forma de pagamento não encontrada." });
    }

    await prisma.formaPagamento.update({
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
    const formasPagamento = await prisma.formaPagamento.findMany({
      where: { userId, ativo: true },
      orderBy: {
        nome: "asc",
      },
    });

    return res.json(formasPagamento);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Ocorreu um erro no servidor." });
  }
});

router.put("/:id", autenticar, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user?.id;
  const { nome, diaValidade, diaFechamento } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Forma de pagamento inválida." });
  }

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const nomeLimpo = typeof nome === "string" ? nome.trim() : "";
  if (!nomeLimpo) {
    return res
      .status(400)
      .json({ error: "Preencha todos os campos obrigatórios." });
  }

  const dias = validarDiasCartao(diaValidade, diaFechamento);
  if (!dias.ok) {
    return res.status(400).json({ error: dias.error });
  }

  try {
    const existe = await prisma.formaPagamento.findUnique({
      where: { id_userId: { id, userId } },
    });

    if (!existe || !existe.ativo) {
      return res
        .status(404)
        .json({ error: "Forma de pagamento não encontrada" });
    }

    const formaPagamentoAtualizada = await prisma.formaPagamento.update({
      where: { id_userId: { id, userId } },
      data: {
        nome: nomeLimpo,
        diaValidade: dias.diaValidade,
        diaFechamento: dias.diaFechamento,
      },
    });

    return res.status(200).json(formaPagamentoAtualizada);
  } catch (err) {
    const conhecido = erroPrisma(err, MSG_NOME_DUPLICADO);
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
    const { count } = await prisma.formaPagamento.updateMany({
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
