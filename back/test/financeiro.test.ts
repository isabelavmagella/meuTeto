import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { gerarRecorrentesDoUsuario } from "../src/utils/recorrencias.js";
import { hojeEmSaoPaulo, dataNoMes } from "../src/utils/datas.js";
import {
  api,
  criarCategoria,
  criarForma,
  criarUsuario,
  dia,
} from "./ajudantes.js";

type Auth = { Authorization: string };

beforeEach(async () => {
  await prisma.demoRateLimit.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Usuário com uma categoria, Pix (sem vencimento) e um cartão (fecha 3, vence 10).
async function cenario() {
  const u = await criarUsuario();
  const casa = await criarCategoria(u.auth, "Casa", "#2d2e83");
  const pix = await criarForma(u.auth, "Pix");
  const cartao = await criarForma(u.auth, "Cartão", 10, 3);
  const lancar = (corpo: Record<string, unknown>) =>
    api
      .post("/api/transactions")
      .set(u.auth)
      .send({
        tipo: "DESPESA",
        descricao: "Compra",
        categoryId: casa.id,
        formaPagamentoId: pix.id,
        ...corpo,
      });
  return { ...u, casa, pix, cartao, lancar };
}

const listar = (auth: Auth, query = "") =>
  api.get(`/api/transactions${query}`).set(auth);

describe("parcelamentos", () => {
  it("cria uma transação por parcela, com vencimentos mês a mês", async () => {
    const c = await cenario();
    const res = await c.lancar({
      valor: 33.33,
      totalParcelas: 3,
      data: "2026-01-31",
      formaPagamentoId: c.cartao.id,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(3);
    const [p1] = res.body;
    expect(res.body.map((p: any) => p.parcelaAtual)).toEqual([1, 2, 3]);
    expect(res.body.every((p: any) => p.totalParcelas === 3)).toBe(true);
    expect(res.body.every((p: any) => p.parcelamentoId === p1.parcelamentoId)).toBe(true);
    expect(res.body.every((p: any) => p.valor === "33.33")).toBe(true);
    expect(res.body.map((p: any) => dia(p.dataVencimento))).toEqual([
      "2026-02-10",
      "2026-03-10",
      "2026-04-10",
    ]);
  });

  it("recusa parcelar em forma de pagamento sem dia de vencimento", async () => {
    const c = await cenario();
    const res = await c.lancar({ valor: 10, totalParcelas: 2, data: "2026-11-01" });
    expect(res.status).toBe(400);
  });

  it("editar a data recalcula o vencimento de todas as parcelas", async () => {
    const c = await cenario();
    const [p1] = (
      await c.lancar({
        valor: 50,
        totalParcelas: 2,
        data: "2026-01-31",
        formaPagamentoId: c.cartao.id,
      })
    ).body;
    const res = await api
      .put(`/api/transactions/${p1.id}`)
      .set(c.auth)
      .send({ ...p1, data: "2026-02-05", totalParcelas: 2 });
    expect(res.status).toBe(200);
    expect(res.body.map((p: any) => dia(p.data))).toEqual(["2026-02-05", "2026-02-05"]);
    expect(res.body.map((p: any) => dia(p.dataVencimento))).toEqual([
      "2026-03-10",
      "2026-04-10",
    ]);
  });

  it("não deixa mudar o número de parcelas na edição", async () => {
    const c = await cenario();
    const [p1] = (
      await c.lancar({
        valor: 50,
        totalParcelas: 2,
        data: "2026-01-31",
        formaPagamentoId: c.cartao.id,
      })
    ).body;
    const res = await api
      .put(`/api/transactions/${p1.id}`)
      .set(c.auth)
      .send({ ...p1, totalParcelas: 3 });
    expect(res.status).toBe(400);
  });

  it("apagar uma parcela (inclusive a do meio) apaga o parcelamento inteiro", async () => {
    const c = await cenario();
    const parcelas = (
      await c.lancar({
        valor: 10,
        totalParcelas: 3,
        data: "2026-01-31",
        formaPagamentoId: c.cartao.id,
      })
    ).body;
    await api.delete(`/api/transactions/${parcelas[1].id}`).set(c.auth).expect(204);
    expect(
      await prisma.transaction.count({
        where: { parcelamentoId: parcelas[0].parcelamentoId },
      }),
    ).toBe(0);
  });

  it("a exclusão em lote leva as outras parcelas e ignora ids de outro usuário", async () => {
    const c = await cenario();
    const outro = await cenario();
    const parcelas = (
      await c.lancar({
        valor: 10,
        totalParcelas: 3,
        data: "2026-01-31",
        formaPagamentoId: c.cartao.id,
      })
    ).body;
    const alheia = (await outro.lancar({ valor: 5, data: "2026-11-01" })).body;

    const res = await api
      .delete("/api/transactions")
      .set(c.auth)
      .send({ ids: [parcelas[0].id, alheia.id] });
    expect(res.body.excluidas).toBe(3);
    expect(await prisma.transaction.findUnique({ where: { id: alheia.id } })).not.toBeNull();
  });
});

describe("validação de transações", () => {
  it("recusa valor com mais de 2 casas, acima do limite ou negativo", async () => {
    const c = await cenario();
    for (const valor of [10.005, 99_999_999_999, -1, 0, "abc"]) {
      const res = await c.lancar({ valor, data: "2026-11-01" });
      expect(res.status, `valor ${valor}`).toBe(400);
    }
    expect((await c.lancar({ valor: 9_999_999_999.99, data: "2026-11-01" })).status).toBe(201);
  });

  it("recusa data com horário/fuso e anos absurdos", async () => {
    const c = await cenario();
    for (const data of ["2026-11-30T22:30:00-03:00", "0001-01-01", "2026-02-30", "ontem"]) {
      const res = await c.lancar({ valor: 1, data });
      expect(res.status, `data ${data}`).toBe(400);
    }
  });

  it("responde 400 (e não 500) para filtros malformados", async () => {
    const c = await cenario();
    expect((await listar(c.auth, "?categoria=abc")).status).toBe(400);
    expect((await listar(c.auth, "?mes=abc")).status).toBe(400);
    expect((await listar(c.auth, "?mes=2026-13")).status).toBe(400);
    expect((await listar(c.auth, "?de=2026-11-30&ate=2026-11-01")).status).toBe(400);
  });
});

describe("filtros da listagem", () => {
  it("combina mês por vencimento, busca sem acento, categoria e data da compra", async () => {
    const c = await cenario();
    const lazer = await criarCategoria(c.auth, "Lazer", "#e06aa6");
    await c.lancar({ valor: 10, descricao: "Café da manhã", data: "2026-11-30" });
    await c.lancar({ valor: 20, descricao: "Cafeteria", data: "2026-11-01", categoryId: lazer.id });
    // Compra de novembro no cartão: vence em dezembro.
    await c.lancar({
      valor: 30,
      descricao: "Café no cartão",
      data: "2026-11-20",
      formaPagamentoId: c.cartao.id,
    });

    const descricoes = async (q: string) =>
      (await listar(c.auth, q)).body.map((t: any) => t.descricao).sort();

    expect(await descricoes("?por=vencimento&mes=2026-11")).toEqual(["Cafeteria", "Café da manhã"]);
    expect(await descricoes("?por=vencimento&mes=2026-12")).toEqual(["Café no cartão"]);
    expect(await descricoes("?por=compra&mes=2026-11")).toHaveLength(3);
    expect(await descricoes("?busca=cafe da")).toEqual(["Café da manhã"]);
    expect(await descricoes(`?busca=caf&categoria=${lazer.id}`)).toEqual(["Cafeteria"]);
    // "até" inclui o dia inteiro.
    expect(await descricoes("?de=2026-11-20&ate=2026-11-30")).toEqual([
      "Café da manhã",
      "Café no cartão",
    ]);
    // Curinga do LIKE é tratado como texto.
    expect(await descricoes("?busca=%25")).toEqual([]);
  });
});

describe("dashboard", () => {
  it("gastar exatamente o orçamento não estoura (somas em centavos)", async () => {
    const c = await cenario();
    await api
      .post("/api/budgets")
      .set(c.auth)
      .send({ mesAno: "2026-11", valorLimite: 150, categoryId: c.casa.id })
      .expect(201);
    for (const valor of [65.37, 73.29, 11.34]) {
      await c.lancar({ valor, data: "2026-11-10" });
    }
    await api
      .post("/api/transactions")
      .set(c.auth)
      .send({ tipo: "RECEITA", valor: 0.1, descricao: "a", data: "2026-11-01" });
    await api
      .post("/api/transactions")
      .set(c.auth)
      .send({ tipo: "RECEITA", valor: 0.2, descricao: "b", data: "2026-11-01" });

    const res = await api
      .get("/api/dashboard/monthly-summary?mesAno=2026-11")
      .set(c.auth)
      .expect(200);
    expect(res.body.kpis.despesa.valor).toBe(150);
    expect(res.body.kpis.receita.valor).toBe(0.3);
    expect(res.body.kpis.saldo.valor).toBe(-149.7);
    expect(res.body.comparacaoOrcamento[0]).toMatchObject({
      limiteOrcamento: 150,
      valorGasto: 150,
      porcentagemUsada: 100,
      ultrapassou: false,
    });
  });

  it("conta compras no cartão no mês do vencimento", async () => {
    const c = await cenario();
    await c.lancar({ valor: 100, data: "2026-11-20", formaPagamentoId: c.cartao.id });
    const mes = async (m: string) =>
      (await api.get(`/api/dashboard/monthly-summary?mesAno=${m}`).set(c.auth)).body
        .kpis.despesa.valor;
    expect(await mes("2026-11")).toBe(0);
    expect(await mes("2026-12")).toBe(100);

    const ano = await api.get("/api/dashboard/historical-trends?ano=2026").set(c.auth);
    expect(ano.body.historico[11].despesa).toBe(100);
    expect(ano.body.historico[10].despesa).toBe(0);
  });
});

describe("recorrências (função SQL)", () => {
  const hoje = hojeEmSaoPaulo();
  const mesAtual = dataNoMes(hoje, 0, 1);

  // Recorrência "criada" há `meses` meses, para o piso da função deixar gerar.
  async function recorrencia(
    userId: number,
    dados: { diaDoMes: number; meses: number; dataFim?: Date; ativo?: boolean },
  ) {
    const inicio = dataNoMes(hoje, -dados.meses, 1);
    return prisma.transacaoRecorrente.create({
      data: {
        tipo: "DESPESA",
        valor: "10.00",
        descricao: "Recorrente",
        diaDoMes: dados.diaDoMes,
        dataInicio: inicio,
        createdAt: inicio,
        dataFim: dados.dataFim ?? null,
        ativo: dados.ativo ?? true,
        userId,
      },
    });
  }
  const geradas = (recorrenciaId: number) =>
    prisma.transaction.findMany({
      where: { recorrenciaId },
      orderBy: { data: "asc" },
    });

  it("dia 31 cai no último dia dos meses curtos", async () => {
    const u = await criarUsuario();
    const r = await recorrencia(u.id, { diaDoMes: 31, meses: 13 });
    await gerarRecorrentesDoUsuario(u.id);
    const lista = await geradas(r.id);
    expect(lista).toHaveLength(14);
    for (const t of lista) {
      const ultimoDia = dataNoMes(t.data, 0, 31);
      expect(dia(t.data)).toBe(dia(ultimoDia));
    }
  });

  it("é idempotente e não recria uma transação gerada que foi apagada", async () => {
    const u = await criarUsuario();
    const r = await recorrencia(u.id, { diaDoMes: 1, meses: 2 });
    expect(await gerarRecorrentesDoUsuario(u.id)).toBe(3);
    expect(await gerarRecorrentesDoUsuario(u.id)).toBe(0);

    const [primeira] = await geradas(r.id);
    await prisma.transaction.delete({ where: { id: primeira!.id } });
    expect(await gerarRecorrentesDoUsuario(u.id)).toBe(0);
    expect(await geradas(r.id)).toHaveLength(2);
  });

  it("nunca gera meses anteriores à criação, mesmo com dataInicio antiga", async () => {
    const u = await criarUsuario();
    const r = await prisma.transacaoRecorrente.create({
      data: {
        tipo: "DESPESA",
        valor: "10.00",
        descricao: "Nova",
        diaDoMes: 1,
        dataInicio: dataNoMes(hoje, -6, 1),
        userId: u.id,
      },
    });
    await gerarRecorrentesDoUsuario(u.id);
    const lista = await geradas(r.id);
    expect(lista).toHaveLength(1);
    expect(dia(lista[0]!.competencia)).toBe(dia(mesAtual));
  });

  it("respeita a dataFim e não gera recorrências inativas", async () => {
    const u = await criarUsuario();
    const comFim = await recorrencia(u.id, {
      diaDoMes: 15,
      meses: 3,
      dataFim: dataNoMes(hoje, -2, 20),
    });
    const inativa = await recorrencia(u.id, { diaDoMes: 1, meses: 2, ativo: false });
    await gerarRecorrentesDoUsuario(u.id);
    expect((await geradas(comFim.id)).map((t) => dia(t.data))).toEqual([
      dia(dataNoMes(hoje, -3, 15)),
      dia(dataNoMes(hoje, -2, 15)),
    ]);
    expect(await geradas(inativa.id)).toHaveLength(0);
  });

  it("editar a recorrência só afeta os meses ainda não gerados", async () => {
    const u = await criarUsuario();
    const r = await recorrencia(u.id, { diaDoMes: 1, meses: 1 });
    await gerarRecorrentesDoUsuario(u.id);
    const res = await api
      .put(`/api/recurring-transactions/${r.id}`)
      .set(u.auth)
      .send({
        tipo: "RECEITA",
        valor: 99,
        descricao: "Editada",
        diaDoMes: 1,
        dataInicio: dia(r.dataInicio),
      });
    expect(res.status).toBe(200);
    expect((await geradas(r.id)).map((t) => [t.descricao, t.valor.toFixed(2)])).toEqual([
      ["Recorrente", "10.00"],
      ["Recorrente", "10.00"],
    ]);
  });
});

describe("regressões", () => {
  it("mover a subcategoria de categoria atualiza as recorrências", async () => {
    const c = await cenario();
    const lazer = await criarCategoria(c.auth, "Lazer", "#e06aa6");
    const sub = (
      await api.post("/api/subcategories").set(c.auth).send({ nome: "Luz", categoryId: c.casa.id })
    ).body;
    const rec = (
      await api.post("/api/recurring-transactions").set(c.auth).send({
        tipo: "DESPESA",
        valor: 100,
        descricao: "Conta de luz",
        diaDoMes: 28,
        dataInicio: "2026-11-01",
        categoryId: c.casa.id,
        subcategoryId: sub.id,
        formaPagamentoId: c.pix.id,
      })
    ).body;

    await api
      .put(`/api/subcategories/${sub.id}`)
      .set(c.auth)
      .send({ nome: "Luz", categoryId: lazer.id })
      .expect(200);

    const depois = await prisma.transacaoRecorrente.findUniqueOrThrow({ where: { id: rec.id } });
    expect(depois.categoryId).toBe(lazer.id);
    const editar = await api.put(`/api/recurring-transactions/${rec.id}`).set(c.auth).send({
      tipo: "DESPESA",
      valor: 120,
      descricao: "Conta de luz",
      diaDoMes: 28,
      dataInicio: "2026-11-01",
      categoryId: lazer.id,
      subcategoryId: sub.id,
      formaPagamentoId: c.pix.id,
    });
    expect(editar.status).toBe(200);
  });

  it("arquivar uma categoria libera a cor dela", async () => {
    const c = await cenario();
    await api.delete(`/api/categories/${c.casa.id}`).set(c.auth).expect(204);
    const nova = await api
      .post("/api/categories")
      .set(c.auth)
      .send({ nome: "Moradia", cor: c.casa.cor });
    expect(nova.status).toBe(201);

    // Entre ativas, a cor continua única.
    const repetida = await api
      .post("/api/categories")
      .set(c.auth)
      .send({ nome: "Outra", cor: c.casa.cor });
    expect(repetida.status).toBe(409);
  });
});
