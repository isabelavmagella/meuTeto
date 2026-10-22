-- CreateEnum
CREATE TYPE "Tipo" AS ENUM ('RECEITA', 'DESPESA');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormaPagamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "diaValidade" INTEGER,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "FormaPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "tipo" "Tipo" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parcelamentoId" TEXT,
    "parcelaAtual" INTEGER,
    "totalParcelas" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "formaPagamentoId" INTEGER NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "mes" DATE NOT NULL,
    "valorLimite" DECIMAL(12,2) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_nome_userId_key" ON "Category"("nome", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_id_userId_key" ON "Category"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FormaPagamento_id_userId_key" ON "FormaPagamento"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FormaPagamento_nome_userId_key" ON "FormaPagamento"("nome", "userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_data_idx" ON "Transaction"("userId", "data");

-- CreateIndex
CREATE INDEX "Transaction_formaPagamentoId_userId_idx" ON "Transaction"("formaPagamentoId", "userId");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_userId_idx" ON "Transaction"("categoryId", "userId");

-- CreateIndex
CREATE INDEX "Transaction_parcelamentoId_idx" ON "Transaction"("parcelamentoId");

-- CreateIndex
CREATE INDEX "Budget_categoryId_userId_idx" ON "Budget"("categoryId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_mes_categoryId_key" ON "Budget"("userId", "mes", "categoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "fk_category_userId" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FormaPagamento" ADD CONSTRAINT "fk_formaPagamento_userId" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "fk_transaction_categoryId" FOREIGN KEY ("categoryId", "userId") REFERENCES "Category"("id", "userId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "fk_transaction_userId" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "fk_transaction_formaPagamentoId" FOREIGN KEY ("formaPagamentoId", "userId") REFERENCES "FormaPagamento"("id", "userId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "fk_budget_categoryId" FOREIGN KEY ("categoryId", "userId") REFERENCES "Category"("id", "userId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "fk_budget_userId" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
