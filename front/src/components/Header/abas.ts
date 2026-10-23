import { IconeConfiguracoes, IconePainel, IconeTransacoes } from "./Icones";

export const ABAS = [
  { para: "/", rotulo: "Painel", Icone: IconePainel },
  { para: "/transactions", rotulo: "Transações", Icone: IconeTransacoes },
  { para: "/settings", rotulo: "Configurações", Icone: IconeConfiguracoes },
] as const;
