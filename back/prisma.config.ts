import "dotenv/config";
import { defineConfig } from "prisma/config";

// O CLI (migrate) precisa de conexão direta: o pooler do Neon (PgBouncer em
// modo transação) não segura o advisory lock das migrations. Em produção,
// DATABASE_URL_UNPOOLED é a URL sem "-pooler"; localmente basta DATABASE_URL.
// O app em si (src/lib/prisma.ts) sempre usa DATABASE_URL.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("Defina DATABASE_URL (veja o README).");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
