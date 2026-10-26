-- CreateTable
CREATE TABLE "Subcategory" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subcategory_categoryId_userId_idx" ON "Subcategory"("categoryId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_userId_categoryId_nome_key" ON "Subcategory"("userId", "categoryId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_id_userId_key" ON "Subcategory"("id", "userId");

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "fk_subcategory_categoryId" FOREIGN KEY ("categoryId", "userId") REFERENCES "Category"("id", "userId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "fk_subcategory_userId" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
