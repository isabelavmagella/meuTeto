import { execSync } from "node:child_process";
import pkg from "pg";
import { urlBancoDeTeste } from "./bancoDeTeste.js";

// Cria o banco de teste se faltar e aplica as migrations nele.
export default async function setup() {
  const alvo = new URL(urlBancoDeTeste());
  const nome = decodeURIComponent(alvo.pathname.slice(1));
  const admin = new URL(alvo);
  admin.pathname = "/postgres";

  const cliente = new pkg.Client({ connectionString: admin.toString() });
  await cliente.connect();
  const { rowCount } = await cliente.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [nome],
  );
  if (!rowCount) await cliente.query(`CREATE DATABASE "${nome.replace(/"/g, '""')}"`);
  await cliente.end();

  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: {
      ...process.env,
      DATABASE_URL: alvo.toString(),
      DATABASE_URL_UNPOOLED: "",
    },
  });
}
