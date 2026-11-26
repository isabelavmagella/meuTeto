import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  dataDoDia,
  dataNoMes,
  vencimentoPrimeiraParcela,
} from "../src/utils/datas.js";
import { centavos, reais } from "../src/utils/dinheiro.js";
import { valorEmReais } from "../src/utils/validacao.js";
import { dia } from "./ajudantes.js";

afterAll(async () => {
  await prisma.$disconnect();
});

const d = (iso: string) => dataDoDia(iso)!;
const venc = (compra: string, validade: number, fechamento: number | null) =>
  dia(vencimentoPrimeiraParcela(d(compra), validade, fechamento));

describe("dataNoMes", () => {
  it("limita o dia ao último dia do mês (inclusive em ano bissexto)", () => {
    expect(dia(dataNoMes(d("2026-01-31"), 1, 31))).toBe("2026-02-28");
    expect(dia(dataNoMes(d("2028-01-31"), 1, 31))).toBe("2028-02-29");
    expect(dia(dataNoMes(d("2026-03-15"), 1, 31))).toBe("2026-04-30");
    expect(dia(dataNoMes(d("2026-12-10"), 1, 5))).toBe("2027-01-05");
    expect(dia(dataNoMes(d("2026-01-10"), -1, 31))).toBe("2025-12-31");
  });
});

describe("vencimentoPrimeiraParcela", () => {
  it("cartão com fechamento antes da validade vence no mesmo mês do fechamento", () => {
    // Fecha dia 3, vence dia 10.
    expect(venc("2026-02-02", 10, 3)).toBe("2026-02-10");
    // No dia do fechamento já entra na fatura seguinte.
    expect(venc("2026-02-03", 10, 3)).toBe("2026-03-10");
    expect(venc("2026-01-31", 10, 3)).toBe("2026-02-10");
  });

  it("cartão com validade antes do fechamento vence no mês seguinte ao fechamento", () => {
    // Fecha dia 25, vence dia 5.
    expect(venc("2026-11-20", 5, 25)).toBe("2026-12-05");
    expect(venc("2026-11-26", 5, 25)).toBe("2027-01-05");
  });

  it("sem fechamento, vence no próximo dia de validade depois da compra", () => {
    expect(venc("2026-11-05", 10, null)).toBe("2026-11-10");
    expect(venc("2026-11-10", 10, null)).toBe("2026-12-10");
  });

  it("fechamento e validade no fim do mês respeitam fevereiro", () => {
    expect(venc("2028-02-29", 30, 31)).toBe("2028-04-30");
    expect(venc("2026-02-27", 30, 31)).toBe("2026-03-30");
  });

  it("dá o mesmo resultado que a função SQL usada pelas recorrências", async () => {
    const compras: string[] = [];
    const validades: number[] = [];
    const fechamentos: (number | null)[] = [];
    for (let t = Date.UTC(2027, 11, 1); t <= Date.UTC(2029, 2, 31); t += 3 * 864e5) {
      const compra = new Date(t).toISOString().slice(0, 10);
      for (const validade of [1, 5, 10, 15, 28, 29, 30, 31]) {
        for (const fechamento of [null, 1, 3, 10, 25, 28, 30, 31]) {
          compras.push(compra);
          validades.push(validade);
          fechamentos.push(fechamento);
        }
      }
    }

    const linhas = await prisma.$queryRaw<{ i: bigint; venc: Date }[]>`
      SELECT t.i, vencimento_primeira_parcela(t.c, t.v, t.f) AS venc
      FROM unnest(${compras}::date[], ${validades}::int[], ${fechamentos}::int[])
        WITH ORDINALITY AS t(c, v, f, i)
    `;

    expect(linhas).toHaveLength(compras.length);
    const divergentes = linhas.filter((l) => {
      const k = Number(l.i) - 1;
      return dia(l.venc) !== venc(compras[k]!, validades[k]!, fechamentos[k]!);
    });
    expect(divergentes).toEqual([]);
  });

  it("dia_no_mes do SQL é igual ao dataNoMes do TypeScript", async () => {
    const casos: [string, number, number][] = [];
    for (const base of ["2026-01-31", "2027-02-15", "2028-02-29", "2026-12-31"]) {
      for (const meses of [-13, -1, 0, 1, 2, 12, 25]) {
        for (const diaDoMes of [1, 15, 28, 29, 30, 31]) {
          casos.push([base, meses, diaDoMes]);
        }
      }
    }
    const linhas = await prisma.$queryRaw<{ i: bigint; data: Date }[]>`
      SELECT t.i, dia_no_mes(t.b, t.m, t.d) AS data
      FROM unnest(
        ${casos.map((c) => c[0])}::date[],
        ${casos.map((c) => c[1])}::int[],
        ${casos.map((c) => c[2])}::int[]
      ) WITH ORDINALITY AS t(b, m, d, i)
    `;
    for (const l of linhas) {
      const [base, meses, diaDoMes] = casos[Number(l.i) - 1]!;
      expect(dia(l.data)).toBe(dia(dataNoMes(d(base), meses, diaDoMes)));
    }
  });
});

describe("dataDoDia", () => {
  it("aceita só AAAA-MM-DD válidos (ou o ISO de meia-noite da própria API)", () => {
    expect(dia(dataDoDia("2028-02-29"))).toBe("2028-02-29");
    expect(dia(dataDoDia("2026-11-30T00:00:00.000Z"))).toBe("2026-11-30");
    expect(dataDoDia("2026-02-30")).toBeNull();
    expect(dataDoDia("2026-11-30T22:30:00-03:00")).toBeNull();
    expect(dataDoDia("0001-01-01")).toBeNull();
    expect(dataDoDia(20261130)).toBeNull();
  });
});

describe("dinheiro", () => {
  it("soma em centavos sem erro de float", () => {
    const soma = ["65.37", "73.29", "11.34"].reduce((s, v) => s + centavos(v), 0);
    expect(soma).toBe(15000);
    expect(reais(soma)).toBe(150);
    expect(reais(centavos("0.10") + centavos("0.20"))).toBe(0.3);
  });

  it("valorEmReais recusa valores inválidos em vez de arredondar", () => {
    expect(valorEmReais(0.29)).toBe("0.29");
    expect(valorEmReais("33.33")).toBe("33.33");
    expect(valorEmReais(9_999_999_999.99)).toBe("9999999999.99");
    expect(valorEmReais(10.005)).toBeNull();
    expect(valorEmReais(10_000_000_000)).toBeNull();
    expect(valorEmReais(0)).toBeNull();
    expect(valorEmReais(-5)).toBeNull();
    expect(valorEmReais("abc")).toBeNull();
    expect(valorEmReais("")).toBeNull();
    expect(valorEmReais(null)).toBeNull();
  });
});
