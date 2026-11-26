import { Navigate, Route, Routes } from "react-router-dom";
import { Register } from "./pages/Register/Register";
import { AuthProvider } from "./contexts/AuthContext";
import { Login } from "./pages/Login/Login";
import { Inicio } from "./pages/Inicio/Inicio";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { Transactions } from "./pages/Transactions/Transactions";
import { Settings } from "./pages/Settings/Settings";
import { CADASTRO_LIBERADO } from "./lib/api";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/inicio" element={<Inicio />} />

        {/* Cadastro e login só no ambiente local (VITE_ALLOW_REGISTRATION). */}
        {CADASTRO_LIBERADO && (
          <>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
          </>
        )}

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
