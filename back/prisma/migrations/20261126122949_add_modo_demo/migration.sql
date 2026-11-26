-- AlterTable
ALTER TABLE "User" ADD COLUMN     "demoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DemoRateLimit" (
    "id" SERIAL NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoRateLimit_ipHash_createdAt_idx" ON "DemoRateLimit"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "User_isDemo_demoExpiresAt_idx" ON "User"("isDemo", "demoExpiresAt");

-- gerar_transacoes_recorrentes ganha p_user_id, para lançar só as recorrências
-- de um usuário (o app chama ao carregar, sem depender de job diário). Mudar a
-- assinatura com CREATE OR REPLACE criaria uma sobrecarga e deixaria ambíguas
-- as chamadas que usam os defaults, por isso o DROP antes.
--
-- O corpo é o mesmo da migration 20261123211908: piso em GREATEST(dataInicio,
-- createdAt em America/Sao_Paulo, ultimaCompetencia + 1 mês) e idempotência
-- via ON CONFLICT. Só os filtros por p_user_id são novos.
DROP FUNCTION IF EXISTS gerar_transacoes_recorrentes(date, int);

CREATE FUNCTION gerar_transacoes_recorrentes(
  p_ate date DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  p_recorrencia_id int DEFAULT NULL,
  p_user_id int DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_mes_final date := date_trunc('month', p_ate::timestamp)::date;
  v_inseridas integer;
BEGIN
  INSERT INTO "Transaction" (
    tipo, valor, descricao, data, "dataVencimento",
    "categoryId", "subcategoryId", "formaPagamentoId", "userId",
    "recorrenciaId", competencia
  )
  SELECT
    r.tipo, r.valor, r.descricao, o.dia::timestamp,
    vencimento_primeira_parcela(o.dia, f."diaValidade", f."diaFechamento"),
    r."categoryId", r."subcategoryId", r."formaPagamentoId", r."userId",
    r.id, o.competencia
  FROM "TransacaoRecorrente" r
  CROSS JOIN LATERAL generate_series(
    GREATEST(
      date_trunc('month', r."dataInicio"::timestamp),
      date_trunc('month', (r."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'),
      COALESCE(r."ultimaCompetencia"::timestamp + interval '1 month', '-infinity'::timestamp)
    ),
    v_mes_final::timestamp,
    interval '1 month'
  ) AS s(mes)
  CROSS JOIN LATERAL (
    SELECT s.mes::date AS competencia, dia_no_mes(s.mes::date, 0, r."diaDoMes") AS dia
  ) AS o
  LEFT JOIN "FormaPagamento" f
    ON f.id = r."formaPagamentoId" AND f."userId" = r."userId"
  WHERE r.ativo
    AND (p_recorrencia_id IS NULL OR r.id = p_recorrencia_id)
    AND (p_user_id IS NULL OR r."userId" = p_user_id)
    AND o.dia >= r."dataInicio"
    AND (r."dataFim" IS NULL OR o.dia <= r."dataFim")
  ON CONFLICT ("recorrenciaId", competencia) DO NOTHING;

  GET DIAGNOSTICS v_inseridas = ROW_COUNT;

  UPDATE "TransacaoRecorrente" r
  SET "ultimaCompetencia" = v_mes_final
  WHERE r.ativo
    AND (p_recorrencia_id IS NULL OR r.id = p_recorrencia_id)
    AND (p_user_id IS NULL OR r."userId" = p_user_id)
    AND (r."ultimaCompetencia" IS NULL OR r."ultimaCompetencia" < v_mes_final);

  RETURN v_inseridas;
END;
$$;
