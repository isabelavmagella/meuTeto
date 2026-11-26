import { prisma } from "../lib/prisma.js";

type ClienteSql = Pick<typeof prisma, "$queryRaw">;

// Lança o que faltar, até o mês atual, das recorrências ativas do usuário.
// Idempotente e barato, então dá para chamar a cada carregamento do app em vez
// de depender de um job diário.
export async function gerarRecorrentesDoUsuario(
  userId: number,
  tx: ClienteSql = prisma,
): Promise<number> {
  const [linha] = await tx.$queryRaw<{ geradas: number }[]>`
    SELECT gerar_transacoes_recorrentes(p_user_id => ${userId}::int) AS geradas
  `;
  return linha?.geradas ?? 0;
}
