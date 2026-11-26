import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import pkg from "pg";

const { Pool } = pkg;

// Um único Pool/PrismaClient por instância (escopo do módulo), reaproveitado
// entre as requisições. Em produção, DATABASE_URL é a URL com pooler do Neon
// (host "-pooler"), então o pool local pode ser pequeno.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  // Fecha conexões ociosas logo, para a instância suspender sem segurá-las.
  idleTimeoutMillis: 5_000,
  // O Neon free suspende o banco depois de 5 min parado e leva um instante
  // para acordar.
  connectionTimeoutMillis: 15_000,
});

// Na Vercel (Fluid compute), fecha as conexões ociosas antes de a instância
// ser suspensa.
if (process.env.VERCEL) attachDatabasePool(pool);

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
