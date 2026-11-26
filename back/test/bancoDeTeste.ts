import "dotenv/config";

// Banco separado para os testes, no mesmo servidor do DATABASE_URL local.
// Pode ser trocado por TEST_DATABASE_URL.
export function urlBancoDeTeste() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("Defina DATABASE_URL ou TEST_DATABASE_URL.");
  const url = new URL(base);
  url.pathname = "/meu_teto_test";
  return url.toString();
}
