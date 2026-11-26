// Roda no build da Vercel (npm run vercel-build). Aplica as migrations só no
// deploy de produção: um deploy de preview não deve alterar o banco de
// produção (as variáveis de ambiente podem ser as mesmas).
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  console.log("Aplicando migrations (prisma migrate deploy)...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(
    `VERCEL_ENV=${process.env.VERCEL_ENV ?? "(vazio)"}: migrations não aplicadas.`,
  );
}
