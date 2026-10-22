export const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const moedaInteira = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export const percentual = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function capitalizar(texto: string) {
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}

export function nomeDoMes(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    timeZone: "UTC",
  });
}

export function formatarEixo(valor: number) {
  if (valor === 0) return "R$ 0";
  const sinal = valor < 0 ? "-" : "";
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) {
    return `${sinal}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (abs >= 1000) {
    return `${sinal}R$ ${(abs / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return `${sinal}R$ ${abs.toLocaleString("pt-BR")}`;
}
