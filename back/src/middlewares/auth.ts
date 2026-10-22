import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

interface TokenPayload {
  id: number;
}

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

    req.user = { id: decoded.id };
    
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
