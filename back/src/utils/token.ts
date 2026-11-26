import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface TokenPayload {
  id: number;
  // Só nos tokens do modo demonstração.
  demo?: true;
}

const DURACAO_LOGIN = "8h";

export function tokenDeLogin(id: number) {
  return jwt.sign({ id } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: DURACAO_LOGIN,
  });
}

// O token do demo expira junto com o usuário (demoExpiresAt).
export function tokenDeDemo(id: number, expiraEm: Date) {
  return jwt.sign(
    {
      id,
      demo: true,
      exp: Math.floor(expiraEm.getTime() / 1000),
    } satisfies TokenPayload & { exp: number },
    config.jwtSecret,
  );
}
