import { Route, Routes } from "react-router-dom";
import { Register } from "./pages/Register/Register";
import { AuthProvider } from "./contexts/AuthContext";
import { Login } from "./pages/Login/Login";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { Transactions } from "./pages/Transactions/Transactions";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
