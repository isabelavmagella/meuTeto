import { createHmac } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { autenticar } from "../middlewares/auth.js";
import { tokenDeDemo } from "../utils/token.js";
import { criarUsuarioDemo } from "../demo/dadosExemplo.js";
import {
  JANELA_RATE_LIMIT_MS,
  apagarDemosExpirados,
} from "../demo/limpeza.js";

// Chave do advisory lock que serializa a criação de demos. Sem ele, cliques
// simultâneos passariam juntos pelas contagens de rate limit e de teto.
const LOCK_CRIACAO_DEMO = 727_001;
const HORA_MS = 60 * 60 * 1000;

class LimiteDemo extends Error {}

const router = Router();

// Guarda só o HMAC do IP (nada de IP em texto puro no banco).
function hashDoIp(req: Request) {
  return createHmac("sha256", config.jwtSecret)
    .update(req.ip ?? "desconhecido")
    .digest("hex");
}

async function criarSessao(req: Request, res: Response, substituir?: number) {
  // Limpeza preguiçosa: libera vagas do teto antes de contar.
  await apagarDemosExpirados().catch((err) =>
    console.error("Falha ao apagar demos expirados:", err),
  );

  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + config.demo.duracaoHoras * HORA_MS);
  const ipHash = hashDoIp(req);

  try {
    const user = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS ok FROM pg_advisory_xact_lock(${LOCK_CRIACAO_DEMO}::bigint)`;

        const recentes = await tx.demoRateLimit.count({
          where: {
            ipHash,
            createdAt: { gte: new Date(agora.getTime() - JANELA_RATE_LIMIT_MS) },
          },
        });
        if (recentes >= config.demo.criacoesPorHoraPorIp) {
          throw new LimiteDemo(
            "Você já criou várias demonstrações na última hora. Tente de novo mais tarde.",
          );
        }

        // "Recomeçar do zero": o demo atual sai antes de contar o teto.
        if (substituir) {
          await tx.user.deleteMany({ where: { id: substituir, isDemo: true } });
        }

        const ativos = await tx.user.count({
          where: { isDemo: true, demoExpiresAt: { gt: agora } },
        });
        if (ativos >= config.demo.maxAtivos) {
          throw new LimiteDemo(
            "Muitas pessoas estão usando a demonstração agora. Tente de novo em alguns minutos.",
          );
        }

        await tx.demoRateLimit.create({ data: { ipHash } });
        return criarUsuarioDemo(tx, expiraEm, agora);
      },
      // O Neon pode levar um instante para acordar.
      { maxWait: 15_000, timeout: 20_000 },
    );

    return res.status(201).json({
      token: tokenDeDemo(user.id, expiraEm),
      user,
    });
  } catch (err) {
    if (err instanceof LimiteDemo) {
      return res.status(429).json({ error: err.message, code: "LIMITE_DEMO" });
    }
    console.error(err);
    return res
      .status(500)
      .json({ error: "Não foi possível criar a demonstração." });
  }
}

router.post("/start", (req, res) => criarSessao(req, res));

// Apaga o demo atual e cria outro, já com os dados de exemplo.
router.post("/restart", autenticar, (req, res) => {
  if (!req.user?.isDemo) {
    return res
      .status(403)
      .json({ error: "Disponível só no modo demonstração." });
  }
  return criarSessao(req, res, req.user.id);
});

export default router;
