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

// Fora disso é quase certamente erro de digitação (ex.: ano 0202).
const ANO_MIN = 1900;
const ANO_MAX = 2100;

// "AAAA-MM-DD" (ou o ISO que a API devolve) → meia-noite UTC, como as colunas @db.Date.
export function dataDoDia(valor: unknown): Date | null {
  if (typeof valor !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/.exec(valor);
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (ano < ANO_MIN || ano > ANO_MAX) return null;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
    ? data
    : null;
}

export function primeiroDiaDoMes(mesAno: unknown): Date | null {
  if (typeof mesAno !== "string" || !/^\d{4}-\d{2}$/.test(mesAno)) return null;
  const [ano, mes] = mesAno.split("-").map(Number) as [number, number];
  if (mes < 1 || mes > 12) return null;
  return new Date(Date.UTC(ano, mes - 1, 1));
}

// Dia de hoje em America/Sao_Paulo, como meia-noite UTC (o formato das datas
// gravadas pelo app).
export function hojeEmSaoPaulo(agora = new Date()): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  return dataDoDia(iso)!;
}
