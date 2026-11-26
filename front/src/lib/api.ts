export const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api"
).replace(/\/$/, "");

// Cadastro e login com e-mail/senha só existem quando ligados no build
// (uso local). No ambiente público o acesso é só pelo modo demonstração.
export const CADASTRO_LIBERADO =
  import.meta.env.VITE_ALLOW_REGISTRATION === "true";

const TOKEN_KEY = "token";

// O token do demo fica no sessionStorage (um por aba), para dois demos
// abertos em abas diferentes não trocarem de token entre si. O login normal
// fica no localStorage, como antes.
export function obterToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function salvarToken(token: string, demo: boolean) {
  apagarToken();
  (demo ? sessionStorage : localStorage).setItem(TOKEN_KEY, token);
}

export function apagarToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

// Disparado quando a API avisa que o demo expirou; o AuthProvider escuta e
// volta para a tela inicial.
export const EVENTO_DEMO_EXPIRADO = "meu-teto:demo-expirado";

export function cabecalhos() {
  const token = obterToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// fetch para a API com o token. Avisa o app se o demo expirou.
export async function requisitar(caminho: string, init: RequestInit = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...init,
    headers: { ...cabecalhos(), ...init.headers },
  });
  if (resposta.status === 401) {
    const corpo = (await resposta
      .clone()
      .json()
      .catch(() => null)) as { code?: string } | null;
    if (corpo?.code === "DEMO_EXPIRADO") {
      window.dispatchEvent(new Event(EVENTO_DEMO_EXPIRADO));
    }
  }
  return resposta;
}

export async function mensagemDeErro(resposta: Response, padrao: string) {
  const json = (await resposta.json().catch(() => null)) as {
    error?: string;
  } | null;
  return json?.error ?? padrao;
}

export async function buscar<T>(caminho: string, signal: AbortSignal) {
  const resposta = await requisitar(caminho, { signal });
  if (!resposta.ok) return [];
  return (await resposta.json()) as T[];
}

export async function enviar(
  caminho: string,
  metodo: "POST" | "PUT" | "DELETE",
  corpo: unknown,
  mensagemErro: string,
) {
  const resposta = await requisitar(caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta, mensagemErro));
  }
}
