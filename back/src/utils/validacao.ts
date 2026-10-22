type ResultadoDias =
  | { ok: true; diaValidade: number | null; diaFechamento: number | null }
  | { ok: false; error: string };

export function inteiroPositivo(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
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
