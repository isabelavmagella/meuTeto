-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "dataVencimento" DATE;

-- CreateIndex
CREATE INDEX "Transaction_userId_dataVencimento_idx" ON "Transaction"("userId", "dataVencimento");
