import { useEffect, useState } from "react";
import {
  buscarHistorico,
  buscarResumoMensal,
  type Mes,
  type ResumoMensal,
} from "../pages/Dashboard/api";

function mensagemDeErro(e: unknown) {
  if (e instanceof TypeError) return "Não foi possível conectar ao servidor.";
  if (e instanceof Error) return e.message;
  return "Erro ao carregar os dados.";
}

function foiCancelado(e: unknown) {
  return e instanceof DOMException && e.name === "AbortError";
}

type Resultado<T> = {
  chave: string;
  dados: T | null;
  erro: string | null;
};

export function useDashboardData(mesAno: string) {
  const ano = Number(mesAno.slice(0, 4));
  const [tentativa, setTentativa] = useState(0);

  const chaveResumo = `${mesAno}|${tentativa}`;
  const chaveHistorico = `${ano}|${tentativa}`;

  const [resultadoResumo, setResultadoResumo] =
    useState<Resultado<ResumoMensal> | null>(null);
  const [resultadoHistorico, setResultadoHistorico] = useState<Resultado<
    Mes[]
  > | null>(null);

  useEffect(() => {
    const controle = new AbortController();

    buscarResumoMensal(mesAno, controle.signal)
      .then((dados) =>
        setResultadoResumo({ chave: chaveResumo, dados, erro: null }),
      )
      .catch((e) => {
        if (foiCancelado(e)) return;
        setResultadoResumo((anterior) => ({
          chave: chaveResumo,
          dados: anterior?.dados ?? null,
          erro: mensagemDeErro(e),
        }));
      });

    return () => controle.abort();
  }, [mesAno, chaveResumo]);

  useEffect(() => {
    const controle = new AbortController();

    buscarHistorico(ano, controle.signal)
      .then((resposta) =>
        setResultadoHistorico({
          chave: chaveHistorico,
          dados: resposta.historico,
          erro: null,
        }),
      )
      .catch((e) => {
        if (foiCancelado(e)) return;
        setResultadoHistorico((anterior) => ({
          chave: chaveHistorico,
          dados: anterior?.dados ?? null,
          erro: mensagemDeErro(e),
        }));
      });

    return () => controle.abort();
  }, [ano, chaveHistorico]);

  const carregandoResumo = resultadoResumo?.chave !== chaveResumo;
  const carregandoHistorico = resultadoHistorico?.chave !== chaveHistorico;

  const erroResumo =
    resultadoResumo?.chave === chaveResumo ? resultadoResumo.erro : null;
  const erroHistorico =
    resultadoHistorico?.chave === chaveHistorico
      ? resultadoHistorico.erro
      : null;

  return {
    resumo: resultadoResumo?.dados ?? null,
    historico: resultadoHistorico?.dados ?? null,
    carregando: carregandoResumo || carregandoHistorico,
    erro: erroResumo ?? erroHistorico,
    tentarNovamente: () => setTentativa((t) => t + 1),
  };
}
