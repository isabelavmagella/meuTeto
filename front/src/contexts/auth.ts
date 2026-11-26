import { createContext, useContext } from "react";

export type User = {
  id: number;
  nome: string;
  email: string;
  isDemo: boolean;
  // ISO; só nos usuários demo.
  demoExpiresAt: string | null;
};

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // Cria um usuário demo com dados de exemplo e entra com ele.
  entrarDemo: () => Promise<void>;
  // Apaga o demo atual e entra num novo.
  recomecarDemo: () => Promise<void>;
  // Sai do demo e volta para a tela inicial com o aviso de expiração.
  expirarDemo: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const MSG_DEMO_EXPIRADO =
  "Sua sessão de demonstração expirou. Experimente de novo.";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
