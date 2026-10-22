import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { erroPrisma } from "../utils/erros.js";
import { autenticar } from "../middlewares/auth.js";

const SENHA_MIN = 8;
const MSG_EMAIL_DUPLICADO = "E-mail já cadastrado";

function normalizarEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

const router = Router();

router.post("/register", async (req, res) => {
  const { nome, password } = req.body;
  const email = normalizarEmail(req.body.email);

  if (!nome || !email || !password) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  if (typeof password !== "string" || password.length < SENHA_MIN) {
    return res
      .status(400)
      .json({ error: `A senha deve ter pelo menos ${SENHA_MIN} caracteres` });
  }

  try {
    const usuarioExistente = await prisma.user.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      return res.status(409).json({ error: MSG_EMAIL_DUPLICADO });
    }

    const senha_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nome,
        email,
        password: senha_hash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
      },
    });

    return res.status(201).json(user);
  } catch (err) {
    const conhecido = erroPrisma(err, MSG_EMAIL_DUPLICADO);
    if (conhecido)
      return res.status(conhecido.status).json({ error: conhecido.error });
    console.error(err);
    return res.status(500).json({ error: "Erro ao criar usuário" });
  }
});

router.post("/login", async (req, res) => {
  const { password } = req.body;
  const email = normalizarEmail(req.body.email);

  if (!email || !password) {
    return res.status(400).json({ error: "Informe e-mail e senha" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "8h",
    });

    return res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ocorreu um erro no servidor" });
  }
});

router.get("/me", autenticar, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, nome: true, email: true },
    });

    if (!user) return res.status(401).json({ error: "Não autenticado" });

    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

export default router;
