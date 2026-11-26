import { describe, expect, it } from "vitest";
import type { GastoCategoria } from "./api";
import {
  COR_SEM_SUBCATEGORIA,
  NOME_SEM_SUBCATEGORIA,
  distribuicaoDaCategoria,
  distribuicaoGeral,
} from "./distribuicao";

function categoria(
  valor: number,
  subcategorias: [string, number][],
): GastoCategoria {
  return {
    nome: "Moradia",
    cor: "#2d2e83",
    valor,
    subcategorias: subcategorias.map(([nome, v], i) => ({
      id: i + 1,
      nome,
      valor: v,
    })),
  };
}

function somaEmCentavos(valores: number[]) {
  return valores.reduce((soma, v) => soma + Math.round(v * 100), 0);
}

describe("distribuicaoDaCategoria", () => {
  it("ordena por valor decrescente e aplica 100/75/55/40%, repetindo 40% depois da 4ª", () => {
    const { fatias } = distribuicaoDaCategoria(
      categoria(150, [
        ["Internet", 10],
        ["Aluguel", 50],
        ["Gás", 5],
        ["Energia", 30],
        ["Água", 20],
        ["Condomínio", 35],
      ]),
    );

    expect(fatias.map((f) => f.nome)).toEqual([
      "Aluguel",
      "Condomínio",
      "Energia",
      "Água",
      "Internet",
      "Gás",
    ]);
    expect(fatias.map((f) => f.opacidade)).toEqual([
      1, 0.75, 0.55, 0.4, 0.4, 0.4,
    ]);
    expect(fatias.every((f) => f.cor === "#2d2e83")).toBe(true);
  });

  it('põe "Sem subcategoria" por último mesmo sendo o maior valor, fora da regra de opacidade', () => {
    const { fatias } = distribuicaoDaCategoria(
      categoria(1000, [
        ["Aluguel", 100],
        ["Energia", 50],
      ]),
    );

    const ultima = fatias.at(-1)!;
    expect(ultima.nome).toBe(NOME_SEM_SUBCATEGORIA);
    expect(ultima.valor).toBe(850);
    expect(ultima.cor).toBe(COR_SEM_SUBCATEGORIA);
    expect(ultima.opacidade).toBe(1);
    expect(ultima.semSubcategoria).toBe(true);
    expect(fatias.map((f) => f.opacidade)).toEqual([1, 0.75, 1]);
  });

  it("não cria a fatia sem subcategoria quando tudo está classificado", () => {
    const { fatias } = distribuicaoDaCategoria(
      categoria(80, [
        ["Aluguel", 50],
        ["Energia", 30],
      ]),
    );
    expect(fatias.some((f) => f.semSubcategoria)).toBe(false);
  });

  it("soma das fatias bate exatamente com o total da categoria, mesmo com centavos quebrados", () => {
    const cat = categoria(0.1 + 0.2 + 99.99 + 12.35, [
      ["A", 0.1],
      ["B", 0.2],
      ["C", 99.99],
    ]);
    const { total, fatias } = distribuicaoDaCategoria(cat);

    expect(somaEmCentavos(fatias.map((f) => f.valor))).toBe(
      Math.round(total * 100),
    );
    expect(total).toBe(112.64);
    expect(fatias.reduce((s, f) => s + f.percentual, 0)).toBeCloseTo(100, 9);
  });

  it('categoria sem subcategoria usada mostra só "Sem subcategoria" a 100%', () => {
    const { total, fatias } = distribuicaoDaCategoria(categoria(250, []));

    expect(total).toBe(250);
    expect(fatias).toHaveLength(1);
    expect(fatias[0]).toMatchObject({
      nome: NOME_SEM_SUBCATEGORIA,
      valor: 250,
      percentual: 100,
    });
  });

  it("subcategoria com valor zero não vira fatia nem consome opacidade", () => {
    const { fatias } = distribuicaoDaCategoria(
      categoria(60, [
        ["Aluguel", 40],
        ["Zerada", 0],
        ["Energia", 20],
      ]),
    );

    expect(fatias.map((f) => f.nome)).toEqual(["Aluguel", "Energia"]);
    expect(fatias.map((f) => f.opacidade)).toEqual([1, 0.75]);
  });

  it("categoria sem gasto no período não gera fatias", () => {
    expect(distribuicaoDaCategoria(categoria(0, [["Aluguel", 0]]))).toEqual({
      total: 0,
      fatias: [],
    });
  });
});

describe("distribuicaoGeral", () => {
  it("mostra só as categorias principais, em ordem decrescente e com percentual do total", () => {
    const { fatias } = distribuicaoGeral(
      [
        { nome: "Lazer", cor: "#e06aa6", valor: 25, subcategorias: [] },
        {
          nome: "Moradia",
          cor: "#2d2e83",
          valor: 75,
          subcategorias: [{ id: 1, nome: "Aluguel", valor: 75 }],
        },
        { nome: "Viagem", cor: "#14b8a6", valor: 0, subcategorias: [] },
      ],
      100,
    );

    expect(fatias.map((f) => [f.nome, f.percentual])).toEqual([
      ["Moradia", 75],
      ["Lazer", 25],
    ]);
  });
});
