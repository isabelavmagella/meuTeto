import { prisma } from "../lib/prisma.js";

export const MSG_SUBCATEGORIA_INVALIDA = "Subcategoria inválida.";
export const MSG_SUBCATEGORIA_SEM_CATEGORIA =
  "Informe a categoria para usar uma subcategoria.";
const MSG_SUBCATEGORIA_NAO_ENCONTRADA = "Subcategoria não encontrada.";
const MSG_SUBCATEGORIA_DE_OUTRA_CATEGORIA =
  "A subcategoria não pertence à categoria informada.";

export async function validarSubcategoria(
  id: number,
  categoria: number,
  userId: number,
  exigirAtiva: boolean,
) {
  const subcategoria = await prisma.subcategory.findUnique({
    where: { id_userId: { id, userId } },
  });
  if (!subcategoria || (exigirAtiva && !subcategoria.ativo)) {
    return { status: 404, error: MSG_SUBCATEGORIA_NAO_ENCONTRADA };
  }
  if (subcategoria.categoryId !== categoria) {
    return { status: 400, error: MSG_SUBCATEGORIA_DE_OUTRA_CATEGORIA };
  }
  return null;
}
