import { prisma } from "../lib/prisma.js";

export const JANELA_RATE_LIMIT_MS = 60 * 60 * 1000;

// Apaga os demos vencidos (o resto dos dados vai junto, em cascata) e os
// registros de rate limit que já saíram da janela. Roda de forma preguiçosa no
// /demo/start e uma vez por dia pelo Vercel Cron.
export async function apagarDemosExpirados(agora = new Date()) {
  const [demos, registros] = await prisma.$transaction([
    prisma.user.deleteMany({
      where: { isDemo: true, demoExpiresAt: { lt: agora } },
    }),
    prisma.demoRateLimit.deleteMany({
      where: {
        createdAt: { lt: new Date(agora.getTime() - JANELA_RATE_LIMIT_MS) },
      },
    }),
  ]);
  return { demosApagados: demos.count, registrosApagados: registros.count };
}
