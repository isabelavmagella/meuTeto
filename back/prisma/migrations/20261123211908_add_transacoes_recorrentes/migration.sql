-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "competencia" DATE,
ADD COLUMN     "recorrenciaId" INTEGER;

-- CreateTable
CREATE TABLE "TransacaoRecorrente" (
    "id" SERIAL NOT NULL,
    "tipo" "Tipo" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "diaDoMes" INTEGER NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimaCompetencia" DATE,
    "categoryId" INTEGER,
    "subcategoryId" INTEGER,
    "formaPagamentoId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransacaoRecorrente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransacaoRecorrente_userId_ativo_idx" ON "TransacaoRecorrente"("userId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "TransacaoRecorrente_id_userId_key" ON "TransacaoRecorrente"("id", "userId");

-- CreateIndex
CREATE INDEX "Transaction_recorrenciaId_userId_idx" ON "Transaction"("recorrenciaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_recorrenciaId_competencia_key" ON "Transaction"("recorrenciaId", "competencia");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "fk_transaction_recorrenciaId" FOREIGN KEY ("recorrenciaId", "userId") REFERENCES "TransacaoRecorrente"("id", "userId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TransacaoRecorrente" ADD CONSTRAINT "fk_transacaoRecorrente_categoryId" FOREIGN KEY ("categoryId", "userId") REFERENCES "Category"("id", "userId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TransacaoRecorrente" ADD CONSTRAINT "fk_transacaoRecorrente_subcategoryId" FOREIGN KEY ("subcategoryId", "userId") REFERENCES "Subcategory"("id", "userId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TransacaoRecorrente" ADD CONSTRAINT "fk_transacaoRecorrente_formaPagamentoId" FOREIGN KEY ("formaPagamentoId", "userId") REFERENCES "FormaPagamento"("id", "userId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TransacaoRecorrente" ADD CONSTRAINT "fk_transacaoRecorrente_userId" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- Checks
ALTER TABLE "TransacaoRecorrente"
  ADD CONSTRAINT "ck_transacaoRecorrente_diaDoMes" CHECK ("diaDoMes" BETWEEN 1 AND 31),
  ADD CONSTRAINT "ck_transacaoRecorrente_datas" CHECK ("dataFim" IS NULL OR "dataFim" >= "dataInicio");

-- Porte de dataNoMes (src/utils/datas.ts): o dia é limitado ao último dia do
-- mês, então dia 31 cai em 28/02 (29/02 em ano bissexto), 30/04 etc.
CREATE OR REPLACE FUNCTION dia_no_mes(p_base date, p_meses int, p_dia int)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (x.mes + (LEAST(p_dia, EXTRACT(DAY FROM x.mes + interval '1 month' - interval '1 day')::int) - 1) * interval '1 day')::date
  FROM (SELECT date_trunc('month', p_base::timestamp) + p_meses * interval '1 month' AS mes) AS x
$$;

-- Porte de vencimentoPrimeiraParcela (src/utils/datas.ts), a mesma regra que
-- as transações normais usam para preencher "dataVencimento". Sem dia de
-- validade (Pix, débito...) devolve NULL, como no app.
CREATE OR REPLACE FUNCTION vencimento_primeira_parcela(p_compra date, p_dia_validade int, p_dia_fechamento int)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_data date;
BEGIN
  IF p_dia_validade IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_dia_fechamento IS NULL THEN
    v_data := dia_no_mes(p_compra, 0, p_dia_validade);
    IF v_data <= p_compra THEN
      v_data := dia_no_mes(p_compra, 1, p_dia_validade);
    END IF;
    RETURN v_data;
  END IF;

  -- Primeiro fechamento depois da compra; vence no mesmo mês do fechamento se
  -- o dia de validade vier depois dele, senão no mês seguinte.
  v_data := dia_no_mes(p_compra, 0, p_dia_fechamento);
  IF v_data <= p_compra THEN
    v_data := dia_no_mes(p_compra, 1, p_dia_fechamento);
  END IF;
  RETURN dia_no_mes(
    v_data,
    CASE WHEN p_dia_validade > p_dia_fechamento THEN 0 ELSE 1 END,
    p_dia_validade
  );
END;
$$;

-- Lança as transações das recorrências ativas até o mês de p_ate (o mês
-- inteiro, inclusive dias futuros). Idempotente: pode rodar todo dia.
--
-- Cada recorrência começa no mês mais tardio entre: o da "dataInicio", o da
-- criação (em America/Sao_Paulo; nunca gera meses anteriores a ela) e o
-- seguinte à "ultimaCompetencia" já processada. Assim, meses em que o job
-- falhou são recuperados, e uma transação gerada que o usuário apagou não
-- volta. O ON CONFLICT é a segunda proteção contra duplicar.
--
-- Retorna quantas transações foram inseridas.
CREATE OR REPLACE FUNCTION gerar_transacoes_recorrentes(
  p_ate date DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  p_recorrencia_id int DEFAULT NULL
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
    AND o.dia >= r."dataInicio"
    AND (r."dataFim" IS NULL OR o.dia <= r."dataFim")
  ON CONFLICT ("recorrenciaId", competencia) DO NOTHING;

  GET DIAGNOSTICS v_inseridas = ROW_COUNT;

  UPDATE "TransacaoRecorrente" r
  SET "ultimaCompetencia" = v_mes_final
  WHERE r.ativo
    AND (p_recorrencia_id IS NULL OR r.id = p_recorrencia_id)
    AND (r."ultimaCompetencia" IS NULL OR r."ultimaCompetencia" < v_mes_final);

  RETURN v_inseridas;
END;
$$;
