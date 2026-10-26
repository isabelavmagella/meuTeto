-- AlterTable
ALTER TABLE "Category" ADD COLUMN "nomeNormalizado" TEXT;
ALTER TABLE "Subcategory" ADD COLUMN "nomeNormalizado" TEXT;

-- Backfill
UPDATE "Category" SET "nomeNormalizado" = lower(trim("nome"));
UPDATE "Subcategory" SET "nomeNormalizado" = lower(trim("nome"));

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "nomeNormalizado" SET NOT NULL;
ALTER TABLE "Subcategory" ALTER COLUMN "nomeNormalizado" SET NOT NULL;

-- DropIndex
DROP INDEX "Category_nome_userId_key";
DROP INDEX "Subcategory_userId_categoryId_nome_key";

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_nomeNormalizado_key" ON "Category"("userId", "nomeNormalizado");
CREATE UNIQUE INDEX "Subcategory_userId_categoryId_nomeNormalizado_key" ON "Subcategory"("userId", "categoryId", "nomeNormalizado");
