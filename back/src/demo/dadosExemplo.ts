import { randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "../generated/prisma/client.js";
import { Tipo } from "../generated/prisma/enums.js";
import {
  dataNoMes,
  hojeEmSaoPaulo,
  vencimentoPrimeiraParcela,
} from "../utils/datas.js";
import { normalizarNome } from "../utils/validacao.js";
import { gerarRecorrentesDoUsuario } from "../utils/recorrencias.js";

// Conjunto inicial do modo demonstração. O app não tem categorias padrão para
// contas normais: o cadastro continua criando o usuário vazio.

const CATEGORIAS = [
  { nome: "Moradia", cor: "#2d2e83", subs: ["Aluguel", "Contas da casa"] },
  {
    nome: "Alimentação",
    cor: "#f07a1a",
    subs: ["Supermercado", "Restaurantes", "Delivery"],
  },
  { nome: "Transporte", cor: "#1d6fd6", subs: ["Combustível", "Aplicativos"] },
  { nome: "Saúde", cor: "#12a36b", subs: ["Farmácia", "Academia"] },
  { nome: "Lazer", cor: "#e06aa6", subs: ["Cinema", "Passeios"] },
  { nome: "Assinaturas", cor: "#8b5cf6", subs: ["Streaming"] },
  { nome: "Compras", cor: "#f5b400", subs: ["Eletrônicos", "Vestuário"] },
  { nome: "Renda", cor: "#14b8a6", subs: ["Salário", "Freelance"] },
] as const;

type NomeCategoria = (typeof CATEGORIAS)[number]["nome"];

const FORMAS = [
  { nome: "Pix", diaValidade: null, diaFechamento: null },
  { nome: "Cartão de débito", diaValidade: null, diaFechamento: null },
  { nome: "Cartão de crédito", diaValidade: 10, diaFechamento: 3 },
  { nome: "Boleto", diaValidade: null, diaFechamento: null },
] as const;

type NomeForma = (typeof FORMAS)[number]["nome"];

type Modelo = {
  descricao: string;
  valor: number;
  dia: number;
  categoria: NomeCategoria;
  sub: string;
  forma: NomeForma;
  tipo?: Tipo;
  parcelas?: number;
  // Gastos variáveis mudam um pouco de mês para mês, para os gráficos não
  // ficarem retos.
  varia?: boolean;
};

// Repetem nos 3 meses (o atual e os 2 anteriores).
const MENSAIS: Modelo[] = [
  { descricao: "Salário", valor: 6500, dia: 5, categoria: "Renda", sub: "Salário", forma: "Pix", tipo: Tipo.RECEITA },
  { descricao: "Supermercado", valor: 412.35, dia: 4, categoria: "Alimentação", sub: "Supermercado", forma: "Cartão de crédito", varia: true },
  { descricao: "Feira e hortifrúti", valor: 138.9, dia: 18, categoria: "Alimentação", sub: "Supermercado", forma: "Cartão de débito", varia: true },
  { descricao: "Restaurante", valor: 96.5, dia: 13, categoria: "Alimentação", sub: "Restaurantes", forma: "Cartão de crédito", varia: true },
  { descricao: "Combustível", valor: 230, dia: 9, categoria: "Transporte", sub: "Combustível", forma: "Cartão de crédito", varia: true },
  { descricao: "Conta de luz", valor: 186.72, dia: 15, categoria: "Moradia", sub: "Contas da casa", forma: "Boleto", varia: true },
  { descricao: "Internet", valor: 109.9, dia: 16, categoria: "Moradia", sub: "Contas da casa", forma: "Boleto" },
  { descricao: "Academia", valor: 99.9, dia: 7, categoria: "Saúde", sub: "Academia", forma: "Cartão de crédito" },
];

// Só em um dos meses: a chave é quantos meses atrás (0 = mês atual).
const PONTUAIS: Record<number, Modelo[]> = {
  2: [
    { descricao: "Notebook", valor: 459.9, dia: 9, categoria: "Compras", sub: "Eletrônicos", forma: "Cartão de crédito", parcelas: 10 },
    { descricao: "Farmácia", valor: 74.3, dia: 11, categoria: "Saúde", sub: "Farmácia", forma: "Cartão de débito" },
    { descricao: "Cinema", valor: 62, dia: 26, categoria: "Lazer", sub: "Cinema", forma: "Cartão de crédito" },
  ],
  1: [
    { descricao: "Projeto freelance", valor: 1200, dia: 21, categoria: "Renda", sub: "Freelance", forma: "Pix", tipo: Tipo.RECEITA },
    { descricao: "Tênis de corrida", valor: 133.3, dia: 27, categoria: "Compras", sub: "Vestuário", forma: "Cartão de crédito", parcelas: 3 },
    { descricao: "Corrida por aplicativo", valor: 28.4, dia: 20, categoria: "Transporte", sub: "Aplicativos", forma: "Cartão de débito" },
    { descricao: "Delivery de pizza", valor: 64.8, dia: 23, categoria: "Alimentação", sub: "Delivery", forma: "Cartão de crédito" },
  ],
  0: [
    { descricao: "Passeio no parque", valor: 45, dia: 2, categoria: "Lazer", sub: "Passeios", forma: "Pix" },
    { descricao: "Farmácia", valor: 39.9, dia: 6, categoria: "Saúde", sub: "Farmácia", forma: "Cartão de débito" },
  ],
};

// Viram recorrências com início hoje. Os meses anteriores entram como
// transações normais (não como geração retroativa da recorrência).
const RECORRENTES: Modelo[] = [
  { descricao: "Aluguel", valor: 1850, dia: 10, categoria: "Moradia", sub: "Aluguel", forma: "Pix" },
  { descricao: "Netflix", valor: 44.9, dia: 17, categoria: "Assinaturas", sub: "Streaming", forma: "Cartão de crédito" },
  { descricao: "Spotify", valor: 21.9, dia: 25, categoria: "Assinaturas", sub: "Streaming", forma: "Cartão de crédito" },
];

const ORCAMENTOS: { categoria: NomeCategoria; valor: number }[] = [
  { categoria: "Alimentação", valor: 900 },
  { categoria: "Transporte", valor: 300 },
  { categoria: "Lazer", valor: 150 },
];

const MESES = [2, 1, 0];
const VARIACAO: Record<number, number> = { 2: 1.06, 1: 0.94, 0: 1 };
const MEIO_DIA_MS = 12 * 60 * 60 * 1000;

export function senhaInutilizavel() {
  // Não é um hash bcrypt válido, então nenhuma senha confere com ela.
  return `!demo:${randomBytes(24).toString("hex")}`;
}

export async function criarUsuarioDemo(
  tx: Prisma.TransactionClient,
  expiraEm: Date,
  agora = new Date(),
) {
  const user = await tx.user.create({
    data: {
      nome: "Visitante",
      email: `demo-${randomUUID()}@demo.meuteto.invalid`,
      password: senhaInutilizavel(),
      isDemo: true,
      demoExpiresAt: expiraEm,
    },
    select: {
      id: true,
      nome: true,
      email: true,
      isDemo: true,
      demoExpiresAt: true,
    },
  });
  const userId = user.id;
  const hoje = hojeEmSaoPaulo(agora);

  const categorias = await tx.category.createManyAndReturn({
    data: CATEGORIAS.map((c) => ({
      nome: c.nome,
      nomeNormalizado: normalizarNome(c.nome),
      cor: c.cor,
      userId,
    })),
  });
  const idCategoria = (nome: string) =>
    categorias.find((c) => c.nome === nome)!.id;

  const subcategorias = await tx.subcategory.createManyAndReturn({
    data: CATEGORIAS.flatMap((c) =>
      c.subs.map((nome) => ({
        nome,
        nomeNormalizado: normalizarNome(nome),
        categoryId: idCategoria(c.nome),
        userId,
      })),
    ),
  });
  const idSub = (categoria: string, nome: string) =>
    subcategorias.find(
      (s) => s.nome === nome && s.categoryId === idCategoria(categoria),
    )!.id;

  const formas = await tx.formaPagamento.createManyAndReturn({
    data: FORMAS.map((f) => ({
      ...f,
      nomeNormalizado: normalizarNome(f.nome),
      userId,
    })),
  });
  const forma = (nome: string) => formas.find((f) => f.nome === nome)!;

  const vinculos = (m: Modelo) => ({
    tipo: m.tipo ?? Tipo.DESPESA,
    descricao: m.descricao,
    categoryId: idCategoria(m.categoria),
    subcategoryId: idSub(m.categoria, m.sub),
    formaPagamentoId: forma(m.forma).id,
    userId,
  });

  // Mesma regra do POST /transactions: o valor é o de cada parcela, e o
  // vencimento segue o fechamento/validade do cartão.
  const lancar = (m: Modelo, data: Date, valor: number) => {
    const f = forma(m.forma);
    const parcelas = m.parcelas ?? 1;
    const venc1 = f.diaValidade
      ? vencimentoPrimeiraParcela(data, f.diaValidade, f.diaFechamento)
      : null;
    const parcelamentoId = parcelas > 1 ? randomUUID() : null;
    return Array.from({ length: parcelas }, (_, i) => ({
      ...vinculos(m),
      valor: valor.toFixed(2),
      data,
      createdAt: new Date(data.getTime() + MEIO_DIA_MS),
      dataVencimento: venc1 ? dataNoMes(venc1, i, f.diaValidade!) : null,
      ...(parcelamentoId && {
        parcelamentoId,
        parcelaAtual: i + 1,
        totalParcelas: parcelas,
      }),
    }));
  };

  const transacoes: Prisma.TransactionCreateManyInput[] = [];
  for (const k of MESES) {
    const modelos = [...MENSAIS, ...(PONTUAIS[k] ?? [])];
    for (const m of modelos) {
      const data = dataNoMes(hoje, -k, m.dia);
      if (data > hoje) continue;
      const valor = m.varia ? m.valor * VARIACAO[k]! : m.valor;
      transacoes.push(...lancar(m, data, valor));
    }
    // Histórico das recorrências: só o que vem antes do início delas (hoje).
    // Daqui em diante, quem lança é a própria recorrência.
    for (const m of RECORRENTES) {
      const data = dataNoMes(hoje, -k, m.dia);
      if (data < hoje) transacoes.push(...lancar(m, data, m.valor));
    }
  }
  await tx.transaction.createMany({ data: transacoes });

  await tx.transacaoRecorrente.createMany({
    data: RECORRENTES.map((m) => ({
      ...vinculos(m),
      valor: m.valor.toFixed(2),
      diaDoMes: m.dia,
      dataInicio: hoje,
    })),
  });

  // O de Lazer fica perto do limite (~90% do já gasto no mês), para o alerta
  // de orçamento do dashboard aparecer na demonstração.
  const mesAtual = dataNoMes(hoje, 0, 1);
  const gastoLazer = transacoes
    .filter(
      (t) => t.categoryId === idCategoria("Lazer") && t.data >= mesAtual,
    )
    .reduce((soma, t) => soma + Number(t.valor), 0);
  await tx.budget.createMany({
    data: ORCAMENTOS.map((o) => ({
      mes: mesAtual,
      valorLimite: (o.categoria === "Lazer"
        ? Math.max(Math.ceil(gastoLazer / 0.9), o.valor / 3)
        : o.valor
      ).toFixed(2),
      categoryId: idCategoria(o.categoria),
      userId,
    })),
  });

  // Lança o mês atual das recorrências, se o dia delas ainda não passou.
  await gerarRecorrentesDoUsuario(userId, tx);

  return user;
}
