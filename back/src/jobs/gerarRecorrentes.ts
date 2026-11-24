// Job diário: lança as transações das recorrências ativas até o mês atual.
// A função é idempotente, então rodar mais de uma vez por dia é seguro.
// Agendar no host, ex.: crontab "0 6 * * * cd /caminho/back && npm run recorrentes:gerar"
// (no Windows, o Agendador de Tarefas rodando o mesmo comando).
import "dotenv/config";
import { prisma } from "../lib/prisma.js";

try {
  const [linha] = await prisma.$queryRaw<{ geradas: number }[]>`
    SELECT gerar_transacoes_recorrentes() AS geradas
  `;
  console.log(`Transações recorrentes geradas: ${linha?.geradas ?? 0}`);
} catch (err) {
  console.error("Falha ao gerar transações recorrentes:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
