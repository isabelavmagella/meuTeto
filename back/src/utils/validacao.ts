type ResultadoDias =
  | { ok: true; diaValidade: number | null; diaFechamento: number | null }
  | { ok: false; error: string };

export function inteiroPositivo(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function normalizarNome(nome: string): string {
  return nome.trim().toLocaleLowerCase("pt-BR");
}

export const mesmoDia = (a: Date, b: Date) =>
    a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

function diaNoMes(v: unknown): number | null | "inválido" {
  if (v == null || v === "") return null;
  const n = inteiroPositivo(v);
  return n && n <= 31 ? n : "inválido";
}

export function validarDiasCartao(
  diaValidade: unknown,
  diaFechamento: unknown,
): ResultadoDias {
  const validade = diaNoMes(diaValidade);
  if (validade === "inválido") {
    return { ok: false, error: "Dia de vencimento inválido." };
  }

  const fechamento = diaNoMes(diaFechamento);
  if (fechamento === "inválido") {
    return { ok: false, error: "Dia de fechamento inválido." };
  }

  if (fechamento !== null && validade === null) {
    return {
      ok: false,
      error: "Informe o dia de vencimento junto com o de fechamento.",
    };
  }

  return { ok: true, diaValidade: validade, diaFechamento: fechamento };
}

// Maior valor que cabe em Decimal(12,2).
export const VALOR_MAX = 9_999_999_999.99;
export const MSG_VALOR_INVALIDO =
  "Valor inválido. Use um número positivo com até 2 casas decimais.";

// Valor em reais vindo da API → string com 2 casas para gravar no Decimal, ou
// null se inválido. Recusa (em vez de arredondar em silêncio) mais de 2 casas,
// e valores acima do que a coluna comporta (que virariam erro 500).
export function valorEmReais(v: unknown): string | null {
  if (typeof v !== "number" && typeof v !== "string") return null;
  if (typeof v === "string" && !v.trim()) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > VALOR_MAX) return null;
  // Com até 2 casas, arredondar para 2 casas devolve o mesmo número.
  const texto = n.toFixed(2);
  return Number(texto) === n ? texto : null;
}
