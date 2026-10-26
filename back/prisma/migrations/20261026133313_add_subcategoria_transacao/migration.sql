-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "subcategoryId" INTEGER;

-- CreateIndex
CREATE INDEX "Transaction_subcategoryId_userId_idx" ON "Transaction"("subcategoryId", "userId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "fk_transaction_subcategoryId" FOREIGN KEY ("subcategoryId", "userId") REFERENCES "Subcategory"("id", "userId") ON DELETE NO ACTION ON UPDATE NO ACTION;
