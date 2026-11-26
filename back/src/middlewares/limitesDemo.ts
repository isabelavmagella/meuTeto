import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { inteiroPositivo } from "../utils/validacao.js";

// Limites só para usuários do modo demonstração, para um visitante não
// encher o banco gratuito. Usuários normais passam direto.

type Recurso =
  | "transacoes"
  | "recorrencias"
  | "categorias"
  | "subcategorias"
  | "formasPagamento"
  | "orcamentos";

const NOMES: Record<Recurso, string> = {
  transacoes: "transações",
  recorrencias: "transações recorrentes",
  categorias: "categorias",
  subcategorias: "subcategorias",
  formasPagamento: "formas de pagamento",
  orcamentos: "orçamentos",
};

// Conta também os registros arquivados (ativo = false): eles continuam
// ocupando espaço e podem ser reativados.
function contar(recurso: Recurso, userId: number) {
  const where = { userId };
  switch (recurso) {
    case "transacoes":
      return prisma.transaction.count({ where });
    case "recorrencias":
      return prisma.transacaoRecorrente.count({ where });
    case "categorias":
      return prisma.category.count({ where });
    case "subcategorias":
      return prisma.subcategory.count({ where });
    case "formasPagamento":
      return prisma.formaPagamento.count({ where });
    case "orcamentos":
      return prisma.budget.count({ where });
  }
}

// Quantos registros a requisição cria: uma compra parcelada vira uma
// transação por parcela.
function novos(recurso: Recurso, corpo: any) {
  if (recurso !== "transacoes") return 1;
  return inteiroPositivo(corpo?.totalParcelas) ?? 1;
}

const CAMPOS_TEXTO = ["descricao", "nome"] as const;

// Para POST/PUT. Com `recurso`, também confere a quantidade (só na criação).
export function limitarDemo(recurso?: Recurso) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.isDemo) return next();

    const maxTexto = config.demo.limites.tamanhoTexto;
    for (const campo of CAMPOS_TEXTO) {
      const valor = req.body?.[campo];
      if (typeof valor === "string" && valor.trim().length > maxTexto) {
        return res.status(400).json({
          error: `No modo demonstração, textos podem ter no máximo ${maxTexto} caracteres.`,
          code: "LIMITE_DEMO",
        });
      }
    }

    if (!recurso) return next();

    try {
      const limite = config.demo.limites[recurso];
      const atual = await contar(recurso, req.user.id);
      if (atual + novos(recurso, req.body) > limite) {
        return res.status(403).json({
          error: `No modo demonstração, o limite é de ${limite} ${NOMES[recurso]}. Apague alguns registros ou clique em "Recomeçar do zero".`,
          code: "LIMITE_DEMO",
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
