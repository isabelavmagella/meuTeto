export const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api"
).replace(/\/$/, "");

export function cabecalhos() {
  const token = localStorage.getItem("token");
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function buscar<T>(caminho: string, signal: AbortSignal) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    signal,
    headers: cabecalhos(),
  });
  if (!resposta.ok) return [];
  return (await resposta.json()) as T[];
}

export async function enviar(
  caminho: string,
  metodo: "POST" | "PUT" | "DELETE",
  corpo: unknown,
  mensagemErro: string,
) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: { ...cabecalhos(), "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    const json = (await resposta.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(json?.error ?? mensagemErro);
  }
}
