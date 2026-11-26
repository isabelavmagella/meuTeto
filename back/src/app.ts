import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import demoRoutes from "./routes/demo.js";
import cronRoutes from "./routes/cron.js";
import paymentsRoutes from "./routes/payments.js";
import transactionsRoutes from "./routes/transactions.js";
import recurringTransactionsRoutes from "./routes/recurringTransactions.js";
import categoriesRoutes from "./routes/categories.js";
import subcategoriesRoutes from "./routes/subcategories.js";
import budgetRoutes from "./routes/budget.js";
import dashboardRoutes from "./routes/dashboard.js";

// O app é exportado sem listen: na Vercel ele vira uma Function; localmente,
// src/server.ts sobe a porta.
const app = express();

// Na Vercel há um proxy na frente e o IP do visitante chega no
// X-Forwarded-For (usado pelo rate limit do demo). Localmente não há proxy, e
// confiar no cabeçalho deixaria qualquer um forjar o IP.
app.set("trust proxy", process.env.VERCEL ? 1 : false);
app.disable("x-powered-by");

app.use(helmet());
app.use(cors({ origin: config.origensFront }));
app.use(express.json({ limit: "20kb" }));

// Sem banco: responde mesmo com o Neon dormindo.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Com banco: o front chama na tela inicial para já ir acordando o Neon.
app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(503).json({ ok: false });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/subcategories", subcategoriesRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/recurring-transactions", recurringTransactionsRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

// Erros que escapam das rotas (JSON malformado, corpo grande demais...).
// Responde em JSON, como o resto da API, sem detalhes internos.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Requisição muito grande." });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON inválido." });
  }
  console.error(err);
  return res.status(500).json({ error: "Ocorreu um erro no servidor" });
});

export default app;
