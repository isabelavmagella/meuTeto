import { defineConfig } from "vitest/config";
import { urlBancoDeTeste } from "./test/bancoDeTeste.js";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["./test/globalSetup.ts"],
    // Os testes compartilham o banco: um arquivo por vez.
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: urlBancoDeTeste(),
      DATABASE_URL_UNPOOLED: "",
      JWT_SECRET: "segredo-so-para-testes",
      CRON_SECRET: "cronDeTeste123456",
      ALLOW_REGISTRATION: "false",
      VERCEL: "",
    },
  },
});
