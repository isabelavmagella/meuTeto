import { z } from "zod";

export const transacaoSchema = z
  .object({
    tipo: z.enum(["RECEITA", "DESPESA"]),
    valor: z.number().positive("Informe o valor."),
    descricao: z.string().trim().min(1, "Informe a descrição."),
    data: z.string().min(1, "Informe a data."),
    totalParcelas: z.string(),
    categoryId: z.string(),
    formaPagamentoId: z.string(),
  })
  .superRefine((dados, ctx) => {
    if (dados.tipo !== "DESPESA") return;
    if (!dados.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Escolha a categoria.",
      });
    }
    if (!dados.formaPagamentoId) {
      ctx.addIssue({
        code: "custom",
        path: ["formaPagamentoId"],
        message: "Escolha a forma de pagamento.",
      });
    }
  });

export type TransacaoData = z.infer<typeof transacaoSchema>;
