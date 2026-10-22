/*
  Warnings:

  - A unique constraint covering the columns `[cor,userId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Category_cor_userId_key" ON "Category"("cor", "userId");
