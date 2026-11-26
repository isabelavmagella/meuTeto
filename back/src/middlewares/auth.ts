import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import type { TokenPayload } from "../utils/token.js";

export const MSG_DEMO_EXPIRADO =
  "Sua sessão de demonstração expirou. Experimente de novo.";

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;

  if (!cabecalho) {
    return res.status(401).json({ error: "Token não enviado" });
  }

  const token = cabecalho.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token não enviado" });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;

    req.user = { id: decoded.id, isDemo: decoded.demo === true };

    next();
  } catch (err) {
    // O token do demo expira junto com o usuário: o front usa o "code" para
    // voltar à tela inicial com uma mensagem própria. A assinatura já foi
    // conferida pelo verify (ele só lança TokenExpiredError depois disso).
    if (err instanceof jwt.TokenExpiredError) {
      const payload = jwt.decode(token) as TokenPayload | null;
      if (payload?.demo) {
        return res
          .status(401)
          .json({ error: MSG_DEMO_EXPIRADO, code: "DEMO_EXPIRADO" });
      }
    }
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
