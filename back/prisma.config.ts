import "dotenv/config";
import { defineConfig } from "prisma/config";

// O CLI (migrate) precisa de conexão direta: o pooler do Neon (PgBouncer em
// modo transação) não segura o advisory lock das migrations. Em produção,
// DATABASE_URL_UNPOOLED é a URL sem "-pooler"; localmente basta DATABASE_URL.
// O app em si (src/lib/prisma.ts) sempre usa DATABASE_URL.
//
// Sem nenhuma das duas (deploy de preview, CI), o prisma generate funciona do
// mesmo jeito, porque não precisa de banco; só os comandos que conectam falham.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(url && { datasource: { url } }),
});
