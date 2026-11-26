// Só para rodar localmente (npm run dev). Na Vercel a entrada é src/app.ts,
// que exporta o app sem listen. Este arquivo também exporta o app e não abre
// porta na Vercel, então funciona qualquer que seja a entrada detectada.
import app from "./app.js";

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
  });
}

export default app;
