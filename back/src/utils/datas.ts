export function dataNoMes(base: Date, meses: number, dia: number): Date {
  const ano = base.getUTCFullYear();
  const mes = base.getUTCMonth() + meses;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDia)));
}

function fechamentoDaFatura(compra: Date, diaFechamento: number): Date {
  const fechamentoNesteMes = dataNoMes(compra, 0, diaFechamento);
  return fechamentoNesteMes > compra
    ? fechamentoNesteMes
    : dataNoMes(compra, 1, diaFechamento);
}

function primeiroVencimento(compra: Date, dia: number): Date {
  const nesteMes = dataNoMes(compra, 0, dia);
  return nesteMes > compra ? nesteMes : dataNoMes(compra, 1, dia);
}

export function vencimentoPrimeiraParcela(
  compra: Date,
  diaValidade: number,
  diaFechamento: number | null,
): Date {
  if (!diaFechamento) {
    return primeiroVencimento(compra, diaValidade);
  }

  const fechamento = fechamentoDaFatura(compra, diaFechamento);
  const mesesAteVencimento = diaValidade > diaFechamento ? 0 : 1;
  return dataNoMes(fechamento, mesesAteVencimento, diaValidade);
}

export function primeiroDiaDoMes(mesAno: unknown): Date | null {
  if (typeof mesAno !== "string" || !/^\d{4}-\d{2}$/.test(mesAno)) return null;
  const [ano, mes] = mesAno.split("-").map(Number) as [number, number];
  if (mes < 1 || mes > 12) return null;
  return new Date(Date.UTC(ano, mes - 1, 1));
}
