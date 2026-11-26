import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, MSG_DEMO_EXPIRADO, type User } from "./auth";
import {
  API_URL,
  EVENTO_DEMO_EXPIRADO,
  apagarToken,
  mensagemDeErro,
  mensagemDeFalha,
  obterToken,
  requisitar,
  salvarToken,
} from "../lib/api";

type RespostaLogin = { token: string; user: User };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!obterToken());
  const [erroSessao, setErroSessao] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!obterToken()) return;

    let cancelled = false;

    // O /me também lança as recorrências do mês no back. Só um 401 encerra a
    // sessão: com falha de rede ou 500 (ex.: banco acordando), o token fica e
    // a pessoa pode tentar de novo sem perder o demo.
    requisitar("/auth/me")
      .then(async (r) => {
        if (r.status === 401) {
          apagarToken();
          return null;
        }
        if (!r.ok) {
          throw new Error(
            await mensagemDeErro(r, "Não foi possível carregar sua sessão."),
          );
        }
        return (await r.json()) as User;
      })
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setErroSessao("");
      })
      .catch((e) => {
        if (!cancelled) setErroSessao(mensagemDeFalha(e));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [tentativa]);

  const tentarSessaoDeNovo = () => {
    setErroSessao("");
    setLoading(true);
    setTentativa((t) => t + 1);
  };

  const entrar = (body: RespostaLogin) => {
    salvarToken(body.token, body.user.isDemo);
    setUser(body.user);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Erro ao entrar");
    entrar(body);
  };

  const logout = useCallback(() => {
    apagarToken();
    setUser(null);
  }, []);

  const entrarDemo = async () => {
    const res = await fetch(`${API_URL}/demo/start`, { method: "POST" });
    if (!res.ok) {
      throw new Error(
        await mensagemDeErro(res, "Não foi possível criar a demonstração."),
      );
    }
    entrar(await res.json());
  };

  const recomecarDemo = async () => {
    const res = await requisitar("/demo/restart", { method: "POST" });
    if (!res.ok) {
      throw new Error(
        await mensagemDeErro(res, "Não foi possível recomeçar a demonstração."),
      );
    }
    salvarToken((await res.json()).token, true);
    // Recarrega para todas as telas buscarem os dados do novo demo.
    window.location.assign("/");
  };

  const expirarDemo = useCallback(() => {
    logout();
    navigate("/inicio", { replace: true, state: { aviso: MSG_DEMO_EXPIRADO } });
  }, [logout, navigate]);

  // Qualquer chamada à API que receba "demo expirado" cai aqui.
  useEffect(() => {
    window.addEventListener(EVENTO_DEMO_EXPIRADO, expirarDemo);
    return () => window.removeEventListener(EVENTO_DEMO_EXPIRADO, expirarDemo);
  }, [expirarDemo]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        entrarDemo,
        recomecarDemo,
        expirarDemo,
        erroSessao,
        tentarSessaoDeNovo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
