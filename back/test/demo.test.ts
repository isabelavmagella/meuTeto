import request from "supertest";
import jwt from "jsonwebtoken";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hojeEmSaoPaulo, dataNoMes } from "../src/utils/datas.js";
import { gerarRecorrentesDoUsuario } from "../src/utils/recorrencias.js";

const api = request(app);
const ENV_ORIGINAL = { ...process.env };

async function criarDemo() {
  const res = await api.post("/api/demo/start");
  expect(res.status).toBe(201);
  return res.body as {
    token: string;
    user: { id: number; isDemo: boolean; demoExpiresAt: string };
  };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function contarTudo(userId: number) {
  const where = { userId };
  const [t, r, c, s, f, b] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transacaoRecorrente.count({ where }),
    prisma.category.count({ where }),
    prisma.subcategory.count({ where }),
    prisma.formaPagamento.count({ where }),
    prisma.budget.count({ where }),
  ]);
  return t + r + c + s + f + b;
}

beforeEach(async () => {
  await prisma.demoRateLimit.deleteMany();
  await prisma.user.deleteMany();
});

afterEach(() => {
  process.env = { ...ENV_ORIGINAL };
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/demo/start", () => {
  it("cria um usuário demo com dados de exemplo e token que expira junto", async () => {
    const { token, user } = await criarDemo();

    expect(user.isDemo).toBe(true);
    const expira = new Date(user.demoExpiresAt).getTime();
    const seisHoras = 6 * 60 * 60 * 1000;
    expect(Math.abs(expira - (Date.now() + seisHoras))).toBeLessThan(60_000);

    const payload = jwt.decode(token) as { id: number; demo: boolean; exp: number };
    expect(payload).toMatchObject({ id: user.id, demo: true });
    expect(payload.exp).toBe(Math.floor(expira / 1000));

    const transacoes = await prisma.transaction.findMany({ where: { userId: user.id } });
    expect(transacoes.length).toBeGreaterThanOrEqual(25);
    expect(transacoes.some((t) => t.tipo === "RECEITA")).toBe(true);
    expect(transacoes.some((t) => (t.totalParcelas ?? 0) > 1)).toBe(true);
    expect(transacoes.some((t) => t.dataVencimento !== null)).toBe(true);

    // Nada no futuro além de parcelas/vencimentos: as datas de compra vão até hoje.
    const hoje = hojeEmSaoPaulo();
    expect(transacoes.every((t) => t.data <= hoje)).toBe(true);
    // Últimos 3 meses.
    expect(transacoes.every((t) => t.data >= dataNoMes(hoje, -2, 1))).toBe(true);

    const cartao = await prisma.formaPagamento.findFirst({
      where: { userId: user.id, diaFechamento: { not: null } },
    });
    expect(cartao?.diaValidade).not.toBeNull();

    const recorrencias = await prisma.transacaoRecorrente.findMany({
      where: { userId: user.id },
    });
    expect(recorrencias).toHaveLength(3);
    expect(recorrencias.every((r) => r.dataInicio.getTime() === hoje.getTime())).toBe(true);

    const orcamentos = await prisma.budget.findMany({ where: { userId: user.id } });
    expect(orcamentos.length).toBeGreaterThanOrEqual(2);
    expect(orcamentos.every((o) => o.mes.getTime() === dataNoMes(hoje, 0, 1).getTime())).toBe(true);

    const me = await api.get("/api/auth/me").set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: user.id, isDemo: true });
  });

  it("isola os dados entre demos", async () => {
    const a = await criarDemo();
    const b = await criarDemo();

    const listaA = await api.get("/api/transactions").set(auth(a.token));
    const listaB = await api.get("/api/transactions").set(auth(b.token));
    const idsA = new Set(listaA.body.map((t: { id: number }) => t.id));
    expect(listaA.body.every((t: { userId: number }) => t.userId === a.user.id)).toBe(true);
    expect(listaB.body.every((t: { userId: number }) => t.userId === b.user.id)).toBe(true);
    expect(listaB.body.some((t: { id: number }) => idsA.has(t.id))).toBe(false);

    // B não consegue apagar nem editar uma transação de A.
    const alvo = listaA.body[0];
    const apagar = await api.delete(`/api/transactions/${alvo.id}`).set(auth(b.token));
    expect(apagar.status).toBe(404);
    const editar = await api
      .put(`/api/transactions/${alvo.id}`)
      .set(auth(b.token))
      .send({ ...alvo, descricao: "invadido" });
    expect(editar.status).toBe(404);
    expect(await prisma.transaction.findUnique({ where: { id: alvo.id } })).toMatchObject({
      descricao: alvo.descricao,
    });
  });

  it("aplica o rate limit por IP", async () => {
    process.env.DEMO_RATE_LIMIT_POR_HORA = "2";
    await criarDemo();
    await criarDemo();
    const res = await api.post("/api/demo/start");
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/última hora/);
  });

  it("respeita o teto global de demos ativos", async () => {
    process.env.DEMO_MAX_ATIVOS = "1";
    await criarDemo();
    const res = await api.post("/api/demo/start");
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Muitas pessoas/);
  });

  it("apaga os demos expirados antes de criar outro (limpeza preguiçosa)", async () => {
    process.env.DEMO_MAX_ATIVOS = "1";
    const antigo = await criarDemo();
    expect(await contarTudo(antigo.user.id)).toBeGreaterThan(0);
    await prisma.user.update({
      where: { id: antigo.user.id },
      data: { demoExpiresAt: new Date(Date.now() - 1000) },
    });

    // O teto é 1, mas o expirado sai antes da contagem.
    await criarDemo();
    expect(await prisma.user.findUnique({ where: { id: antigo.user.id } })).toBeNull();
    expect(await contarTudo(antigo.user.id)).toBe(0);
  });
});

describe("POST /api/demo/restart", () => {
  it("apaga o demo atual e devolve um novo", async () => {
    const atual = await criarDemo();
    const res = await api.post("/api/demo/restart").set(auth(atual.token));
    expect(res.status).toBe(201);
    expect(res.body.user.id).not.toBe(atual.user.id);
    expect(await prisma.user.findUnique({ where: { id: atual.user.id } })).toBeNull();
    expect(await contarTudo(atual.user.id)).toBe(0);
  });
});

describe("expiração", () => {
  it("rejeita token de demo expirado com código próprio", async () => {
    const { user } = await criarDemo();
    const vencido = jwt.sign(
      { id: user.id, demo: true, exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_SECRET!,
    );
    const res = await api.get("/api/transactions").set(auth(vencido));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("DEMO_EXPIRADO");
    expect(res.body.error).toMatch(/expirou/);
  });

  it("não aceita token assinado com outro segredo", async () => {
    const falso = jwt.sign({ id: 1, demo: true, exp: 1 }, "outro-segredo");
    const res = await api.get("/api/transactions").set(auth(falso));
    expect(res.status).toBe(401);
    expect(res.body.code).toBeUndefined();
  });
});

describe("limites do demo", () => {
  it("bloqueia ao passar do limite de categorias", async () => {
    const { token, user } = await criarDemo();
    const atuais = await prisma.category.count({ where: { userId: user.id } });
    process.env.DEMO_MAX_CATEGORIAS = String(atuais);

    const res = await api
      .post("/api/categories")
      .set(auth(token))
      .send({ nome: "Pets", cor: "#9a6b4a" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("LIMITE_DEMO");
    expect(res.body.error).toMatch(/limite é de \d+ categorias/);
  });

  it("conta cada parcela no limite de transações", async () => {
    const { token, user } = await criarDemo();
    const atuais = await prisma.transaction.count({ where: { userId: user.id } });
    process.env.DEMO_MAX_TRANSACOES = String(atuais + 2);
    const cartao = await prisma.formaPagamento.findFirstOrThrow({
      where: { userId: user.id, diaValidade: { not: null } },
    });
    const categoria = await prisma.category.findFirstOrThrow({ where: { userId: user.id } });
    const corpo = {
      tipo: "DESPESA",
      valor: 100,
      descricao: "Cadeira",
      data: "2026-11-01",
      categoryId: categoria.id,
      formaPagamentoId: cartao.id,
    };

    const tresParcelas = await api
      .post("/api/transactions")
      .set(auth(token))
      .send({ ...corpo, totalParcelas: 3 });
    expect(tresParcelas.status).toBe(403);

    const duasParcelas = await api
      .post("/api/transactions")
      .set(auth(token))
      .send({ ...corpo, totalParcelas: 2 });
    expect(duasParcelas.status).toBe(201);
  });

  it("limita o tamanho de textos e do corpo da requisição", async () => {
    const { token } = await criarDemo();
    const longo = await api
      .post("/api/categories")
      .set(auth(token))
      .send({ nome: "x".repeat(500), cor: "#9a6b4a" });
    expect(longo.status).toBe(400);
    expect(longo.body.code).toBe("LIMITE_DEMO");

    const enorme = await api
      .post("/api/categories")
      .set(auth(token))
      .send({ nome: "ok", cor: "#9a6b4a", lixo: "x".repeat(50_000) });
    expect(enorme.status).toBe(413);
  });
});

describe("cron de limpeza", () => {
  it("exige o CRON_SECRET", async () => {
    expect((await api.get("/api/cron/limpar-demos")).status).toBe(401);
    expect(
      (await api.get("/api/cron/limpar-demos").set(auth("errado"))).status,
    ).toBe(401);
  });

  it("apaga só os demos expirados", async () => {
    const vivo = await criarDemo();
    const morto = await criarDemo();
    await prisma.user.update({
      where: { id: morto.user.id },
      data: { demoExpiresAt: new Date(Date.now() - 1000) },
    });

    const res = await api
      .get("/api/cron/limpar-demos")
      .set(auth(process.env.CRON_SECRET!));
    expect(res.status).toBe(200);
    expect(res.body.demosApagados).toBe(1);
    expect(await prisma.user.findUnique({ where: { id: vivo.user.id } })).not.toBeNull();
    expect(await contarTudo(morto.user.id)).toBe(0);
  });
});

describe("recorrências por usuário", () => {
  it("gera só as recorrências do usuário informado", async () => {
    const a = await criarDemo();
    const b = await criarDemo();
    const hoje = hojeEmSaoPaulo();
    const doisMesesAtras = dataNoMes(hoje, -2, 1);

    // Recorrência criada há 2 meses (o piso da função usa createdAt).
    for (const demo of [a, b]) {
      await prisma.transacaoRecorrente.create({
        data: {
          tipo: "DESPESA",
          valor: "10.00",
          descricao: "Teste recorrente",
          diaDoMes: 1,
          dataInicio: doisMesesAtras,
          createdAt: doisMesesAtras,
          userId: demo.user.id,
        },
      });
    }
    const geradas = (userId: number) =>
      prisma.transaction.count({ where: { userId, descricao: "Teste recorrente" } });

    expect(await gerarRecorrentesDoUsuario(a.user.id)).toBe(3);
    expect(await geradas(a.user.id)).toBe(3);
    expect(await geradas(b.user.id)).toBe(0);

    // Idempotente.
    expect(await gerarRecorrentesDoUsuario(a.user.id)).toBe(0);

    // O /me de B lança as dele.
    await api.get("/api/auth/me").set(auth(b.token)).expect(200);
    expect(await geradas(b.user.id)).toBe(3);
  });
});

describe("ALLOW_REGISTRATION", () => {
  const conta = { nome: "Ana", email: "ana@exemplo.com", password: "senha-forte-123" };

  it("bloqueia cadastro e login quando não é 'true'", async () => {
    const cadastro = await api.post("/api/auth/register").send(conta);
    expect(cadastro.status).toBe(403);
    const login = await api.post("/api/auth/login").send(conta);
    expect(login.status).toBe(403);
    expect(await prisma.user.count()).toBe(0);
  });

  it("permite cadastro e login quando é 'true', mas não login de demo", async () => {
    process.env.ALLOW_REGISTRATION = "true";
    expect((await api.post("/api/auth/register").send(conta)).status).toBe(201);
    const login = await api.post("/api/auth/login").send(conta);
    expect(login.status).toBe(200);
    expect(login.body.user.isDemo).toBe(false);

    const { user } = await criarDemo();
    const demo = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const res = await api
      .post("/api/auth/login")
      .send({ email: demo.email, password: demo.password });
    expect(res.status).toBe(401);
  });
});

describe("healthcheck", () => {
  it("responde com e sem banco", async () => {
    expect((await api.get("/api/health")).body).toEqual({ ok: true });
    expect((await api.get("/api/health/db")).body).toEqual({ ok: true });
  });
});
