import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { tokenDeLogin } from "../src/utils/token.js";

export const api = request(app);

// Usuário comum criado direto no banco (nos testes o cadastro fica desligado).
export async function criarUsuario() {
  const user = await prisma.user.create({
    data: {
      nome: "Teste",
      email: `${randomUUID()}@teste.invalid`,
      password: "!sem-login",
    },
  });
  return {
    id: user.id,
    auth: { Authorization: `Bearer ${tokenDeLogin(user.id)}` },
  };
}

type Auth = { Authorization: string };

export async function criarCategoria(auth: Auth, nome: string, cor: string) {
  const res = await api.post("/api/categories").set(auth).send({ nome, cor });
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  return res.body as { id: number; nome: string; cor: string };
}

export async function criarForma(
  auth: Auth,
  nome: string,
  diaValidade: number | null = null,
  diaFechamento: number | null = null,
) {
  const res = await api
    .post("/api/payments")
    .set(auth)
    .send({ nome, diaValidade, diaFechamento });
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  return res.body as { id: number };
}

// "AAAA-MM-DD" das datas que a API devolve (ISO de meia-noite UTC).
export const dia = (iso: string | Date | null) =>
  iso === null ? null : new Date(iso).toISOString().slice(0, 10);
