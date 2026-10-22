import type { Mes } from "./api";

export function temDados(m: Mes) {
  return m.receita !== 0 || m.despesa !== 0;
}

function passoBonito(bruto: number) {
  if (bruto <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(bruto));
  for (const fator of [1, 2, 2.5, 5, 10]) {
    if (fator * magnitude >= bruto) return fator * magnitude;
  }
  return 10 * magnitude;
}

function gerarTicks(base: number, topo: number, passo: number) {
  return Array.from(
    { length: Math.round((topo - base) / passo) + 1 },
    (_, i) => base + i * passo,
  );
}

export function escalaBarras(historico: Mes[]) {
  const maximo = Math.max(
    0,
    ...historico.map((m) => Math.max(m.receita, m.despesa)),
  );
  const passo = passoBonito(maximo / 4);
  const topo = Math.max(Math.ceil(maximo / passo), 1) * passo;
  return { topo, ticks: gerarTicks(0, topo, passo) };
}

export function escalaSaldo(historico: Mes[]) {
  const saldos = historico.filter(temDados).map((m) => m.saldoFinal);
  const minimo = Math.min(0, ...saldos);
  const maximo = Math.max(0, ...saldos);
  const passo = passoBonito((maximo - minimo) / 4);
  let topo = Math.ceil(maximo / passo) * passo;
  const base = Math.floor(minimo / passo) * passo;
  if (topo === base) topo = base + passo;
  return { base, topo, ticks: gerarTicks(base, topo, passo) };
}
