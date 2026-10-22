import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import paymentsRoutes from "./routes/payments.js";
import transactionsRoutes from "./routes/transactions.js";
import categoriesRoutes from "./routes/categories.js";
import budgetRoutes from "./routes/budget.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
