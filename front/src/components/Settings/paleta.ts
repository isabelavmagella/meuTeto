export const PALETA = [
  { nome: "Azul claro", cor: "#4cb8e8" },
  { nome: "Azul", cor: "#1d6fd6" },
  { nome: "Azul escuro", cor: "#2d2e83" },
  { nome: "Roxo", cor: "#8b5cf6" },
  { nome: "Rosa", cor: "#e06aa6" },
  { nome: "Vermelho", cor: "#e5484d" },
  { nome: "Laranja", cor: "#f07a1a" },
  { nome: "Amarelo", cor: "#f5b400" },
  { nome: "Verde", cor: "#12a36b" },
  { nome: "Turquesa", cor: "#14b8a6" },
  { nome: "Marrom", cor: "#9a6b4a" },
  { nome: "Cinza", cor: "#8e8fb3" },
];

export function nomeDaCor(cor: string) {
  return (
    PALETA.find((p) => p.cor.toLowerCase() === cor.toLowerCase())?.nome ?? cor
  );
}
