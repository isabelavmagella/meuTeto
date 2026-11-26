// Uso local/manual: lança as recorrências ativas de TODOS os usuários até o
// mês atual. Em produção não é necessário, porque o app já chama a função por
// usuário a cada carregamento (GET /api/auth/me). A função é idempotente, então
// rodar mais de uma vez é seguro.
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
