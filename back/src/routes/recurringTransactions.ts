import { Router } from "express";
import { autenticar } from "../middlewares/auth.js";
import { limitarDemo } from "../middlewares/limitesDemo.js";
import { prisma } from "../lib/prisma.js";
import { Tipo } from "../generated/prisma/enums.js";
import {
  MSG_VALOR_INVALIDO,
  inteiroPositivo,
  valorEmReais,
} from "../utils/validacao.js";
import { dataDoDia } from "../utils/datas.js";
import {
  MSG_SUBCATEGORIA_INVALIDA,
  MSG_SUBCATEGORIA_SEM_CATEGORIA,
  validarSubcategoria,
} from "../utils/vinculos.js";

const MSG_NAO_ENCONTRADA = "Recorrência não encontrada.";
const MSG_RECORRENCIA_INVALIDA = "Recorrência inválida.";
const MSG_ERRO_INTERNO = "Ocorreu um erro no servidor";

const router = Router();

const incluir = {
  category: true,
  subcategory: true,
  formaPagamento: true,
} as const;

type Vinculos = {
  categoryId: number | null;
  subcategoryId: number | null;
  formaPagamentoId: number | null;
};

type Resultado<T> = { ok: true; dados: T } | { ok: false; status: number; error: string };

// Mesmas regras do POST/PUT de transações. Em edição, manter um vínculo que
// foi arquivado depois é permitido; trocar para um arquivado, não.
async function validar(corpo: any, userId: number, atual?: Vinculos) {
  const falha = (error: string, status = 400) =>
    ({ ok: false, status, error }) as const;

  const {
    tipo,
    valor,
    descricao,
    diaDoMes,
    dataInicio,
    dataFim,
    categoryId,
    subcategoryId,
    formaPagamentoId,
  } = corpo ?? {};

  if (
    !tipo ||
    valor == null ||
    valor === "" ||
    typeof descricao !== "string" ||
    !descricao.trim() ||
    diaDoMes == null ||
    !dataInicio
  ) {
    return falha("Preencha todos os campos obrigatórios.");
  }

  if (!Object.values(Tipo).includes(tipo)) return falha("Tipo inválido");

  const valorValido = valorEmReais(valor);
  if (!valorValido) return falha(MSG_VALOR_INVALIDO);

  const dia = inteiroPositivo(diaDoMes);
  if (!dia || dia > 31) return falha("Dia do mês inválido. Use de 1 a 31.");

  const inicio = dataDoDia(dataInicio);
  if (!inicio) return falha("Data de início inválida.");

  let fim: Date | null = null;
  if (dataFim != null && dataFim !== "") {
    fim = dataDoDia(dataFim);
    if (!fim) return falha("Data de término inválida.");
    if (fim < inicio) {
      return falha("A data de término não pode ser antes da data de início.");
    }
  }

  let categoria: number | null = null;
  if (categoryId != null && categoryId !== "") {
    categoria = inteiroPositivo(categoryId);
    if (!categoria) return falha("Categoria inválida.");
  } else if (tipo === Tipo.DESPESA) {
    return falha("Informe a categoria.");
  }

  let subcategoria: number | null = null;
  if (subcategoryId != null && subcategoryId !== "") {
    subcategoria = inteiroPositivo(subcategoryId);
    if (!subcategoria) return falha(MSG_SUBCATEGORIA_INVALIDA);
    if (!categoria) return falha(MSG_SUBCATEGORIA_SEM_CATEGORIA);
  }

  let formaPagamento: number | null = null;
  if (formaPagamentoId != null && formaPagamentoId !== "") {
    formaPagamento = inteiroPositivo(formaPagamentoId);
    if (!formaPagamento) return falha("Forma de pagamento inválida.");
  } else if (tipo === Tipo.DESPESA) {
    return falha("Informe a forma de pagamento.");
  }

  if (formaPagamento) {
    const forma = await prisma.formaPagamento.findUnique({
      where: { id_userId: { id: formaPagamento, userId } },
    });
    const mudou = formaPagamento !== atual?.formaPagamentoId;
    if (!forma || (mudou && !forma.ativo)) {
      return falha("Forma de pagamento inválida.");
    }
  }

  if (categoria) {
    const cat = await prisma.category.findUnique({
      where: { id_userId: { id: categoria, userId } },
    });
    const mudou = categoria !== atual?.categoryId;
    if (!cat || (mudou && !cat.ativo)) return falha("Categoria inválida.");
  }

  if (subcategoria) {
    const erro = await validarSubcategoria(
      subcategoria,
      categoria!,
      userId,
      subcategoria !== atual?.subcategoryId,
    );
    if (erro) return falha(erro.error, erro.status);
  }

  const dados = {
    tipo: tipo as Tipo,
    valor: valorValido,
    descricao: descricao.trim(),
    diaDoMes: dia,
    dataInicio: inicio,
    dataFim: fim,
    categoryId: categoria,
    subcategoryId: subcategoria,
    formaPagamentoId: formaPagamento,
  };
  return { ok: true, dados } as Resultado<typeof dados>;
}

// Gera na hora o que faltar até o mês atual (inclusive), para o lançamento
// do mês aparecer sem esperar o job diário.
async function gerar(
  tx: Pick<typeof prisma, "$queryRaw">,
  id: number,
): Promise<number> {
  const [linha] = await tx.$queryRaw<{ geradas: number }[]>`
    SELECT gerar_transacoes_recorrentes(p_recorrencia_id => ${id}::int) AS geradas
  `;
  return linha?.geradas ?? 0;
}

router.post("/", autenticar, limitarDemo("recorrencias"), async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  try {
    const validacao = await validar(req.body, userId);
    if (!validacao.ok) {
      return res.status(validacao.status).json({ error: validacao.error });
    }

    const recorrencia = await prisma.$transaction(async (tx) => {
      const { id } = await tx.transacaoRecorrente.create({
        data: { ...validacao.dados, userId },
      });
      const transacoesGeradas = await gerar(tx, id);
      const criada = await tx.transacaoRecorrente.findUniqueOrThrow({
        where: { id },
        include: incluir,
      });
      return { ...criada, transacoesGeradas };
    });

    return res.status(201).json(recorrencia);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: MSG_ERRO_INTERNO });
  }
});

router.get("/", autenticar, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  try {
    const recorrencias = await prisma.transacaoRecorrente.findMany({
      where: { userId, ativo: true },
      include: incluir,
      orderBy: [{ diaDoMes: "asc" }, { descricao: "asc" }],
    });
    return res.json(recorrencias);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar recorrências." });
  }
});

// Só afeta os meses ainda não gerados: o que já foi lançado permanece.
router.put("/:id", autenticar, limitarDemo(), async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const id = inteiroPositivo(req.params.id);
  if (!id) return res.status(400).json({ error: MSG_RECORRENCIA_INVALIDA });

  try {
    const atual = await prisma.transacaoRecorrente.findUnique({
      where: { id_userId: { id, userId } },
    });
    if (!atual || !atual.ativo) {
      return res.status(404).json({ error: MSG_NAO_ENCONTRADA });
    }

    const validacao = await validar(req.body, userId, atual);
    if (!validacao.ok) {
      return res.status(validacao.status).json({ error: validacao.error });
    }

    const recorrencia = await prisma.$transaction(async (tx) => {
      await tx.transacaoRecorrente.update({
        where: { id_userId: { id, userId } },
        data: validacao.dados,
      });
      const transacoesGeradas = await gerar(tx, id);
      const editada = await tx.transacaoRecorrente.findUniqueOrThrow({
        where: { id },
        include: incluir,
      });
      return { ...editada, transacoesGeradas };
    });

    return res.json(recorrencia);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: MSG_ERRO_INTERNO });
  }
});

// "Excluir" só desativa: as transações geradas apontam para a recorrência
// (FK NoAction) e continuam como estão.
router.delete("/:id", autenticar, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const id = inteiroPositivo(req.params.id);
  if (!id) return res.status(400).json({ error: MSG_RECORRENCIA_INVALIDA });

  try {
    const { count } = await prisma.transacaoRecorrente.updateMany({
      where: { id, userId, ativo: true },
      data: { ativo: false },
    });
    if (count === 0) {
      return res.status(404).json({ error: MSG_NAO_ENCONTRADA });
    }
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

  const { ids } = req.body ?? {};
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) {
    return res
      .status(400)
      .json({ error: "Selecione as recorrências a excluir." });
  }

  const idsValidos = [...new Set(ids.map(inteiroPositivo))];
  if (idsValidos.some((id) => !id)) {
    return res.status(400).json({ error: MSG_RECORRENCIA_INVALIDA });
  }

  try {
    const { count } = await prisma.transacaoRecorrente.updateMany({
      where: { userId, ativo: true, id: { in: idsValidos as number[] } },
      data: { ativo: false },
    });
    return res.json({ excluidas: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: MSG_ERRO_INTERNO });
  }
});

export default router;
