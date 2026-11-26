-- A cor da categoria passa a ser única só entre as categorias ativas. Antes,
-- uma categoria arquivada segurava a cor para sempre: o front mostrava a cor
-- como livre, a API respondia 409, e com 12 cores na paleta não dava para ter
-- mais de 12 categorias na vida da conta.

-- DropIndex
DROP INDEX "Category_cor_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Category_cor_userId_key" ON "Category"("cor", "userId") WHERE ("ativo" = true);
