-- AlterTable
ALTER TABLE "FormaPagamento" ADD COLUMN "nomeNormalizado" TEXT;

-- Backfill
UPDATE "FormaPagamento" SET "nomeNormalizado" = lower(trim("nome"));

-- AlterTable
ALTER TABLE "FormaPagamento" ALTER COLUMN "nomeNormalizado" SET NOT NULL;

-- DropIndex
DROP INDEX "FormaPagamento_nome_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "FormaPagamento_userId_nomeNormalizado_key" ON "FormaPagamento"("userId", "nomeNormalizado");
