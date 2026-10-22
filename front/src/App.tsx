import { Route, Routes } from "react-router-dom";
import { Register } from "./pages/Register/Register";
import { AuthProvider } from "./contexts/AuthContext";
import { Login } from "./pages/Login/Login";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
