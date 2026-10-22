import { useState } from "react";
import type { Mes } from "./api";
import { temDados } from "./graficos";

export function useMesAtivo(historico: Mes[], periodo: string) {
  const [mesHover, setMesHover] = useState<number | null>(null);

  const ultimoComDados = historico.reduce(
    (acc, m, i) => (temDados(m) ? i : acc),
    -1,
  );
  const indicePeriodo = Number(periodo.slice(5, 7)) - 1;
  const mesDoPeriodo = historico[indicePeriodo];
  const mesPadrao =
    mesDoPeriodo && temDados(mesDoPeriodo) ? indicePeriodo : ultimoComDados;

  function ativarMes(state: unknown) {
    const label = (state as { activeLabel?: unknown } | null)?.activeLabel;
    const i = historico.findIndex(
      (m) => m.nomeMes.toLowerCase() === String(label),
    );
    const m = historico[i];
    if (m && temDados(m)) setMesHover(i);
  }

  function limparMes() {
    setMesHover(null);
  }

  return { mesAtivo: mesHover ?? mesPadrao, ativarMes, limparMes };
}
