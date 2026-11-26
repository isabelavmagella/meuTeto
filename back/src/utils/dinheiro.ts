// Somas de dinheiro em centavos inteiros: somar reais em float erra
// (65.37 + 73.29 + 11.34 dá 150.00000000000003, e um orçamento de 150 "estoura").
// Decimal(12,2) vai até 9.999.999.999,99, ou seja, ~1e12 centavos: muito abaixo
// do limite de inteiros exatos do Number (2^53).

type Valor = { toFixed(casas: number): string } | string | number;

export function centavos(valor: Valor): number {
  const texto =
    typeof valor === "object" ? valor.toFixed(2) : Number(valor).toFixed(2);
  return Math.round(Number(texto) * 100);
}

// Centavos → reais (a divisão por 100 dá o double mais próximo, que o JSON
// serializa com as duas casas certas).
export function reais(emCentavos: number): number {
  return emCentavos / 100;
}
