import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { config } from "../config.js";
import { apagarDemosExpirados } from "../demo/limpeza.js";

const router = Router();

function autorizado(cabecalho: string | undefined) {
  const segredo = config.cronSecret;
  if (!segredo || !cabecalho) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(cabecalho);
  return (
    esperado.length === recebido.length && timingSafeEqual(esperado, recebido)
  );
}

// Chamada pelo Vercel Cron (GET, com "Authorization: Bearer $CRON_SECRET").
router.get("/limpar-demos", async (req, res) => {
  if (!autorizado(req.headers.authorization)) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    return res.json(await apagarDemosExpirados());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha na limpeza." });
  }
});

export default router;
