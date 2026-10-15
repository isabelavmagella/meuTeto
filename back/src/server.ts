import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import paymentsRoutes from "./routes/payments.js";
import transactionsRoutes from "./routes/transactions.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/transactions", transactionsRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
