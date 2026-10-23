import { useState } from "react";
import styles from "./Dashboard.module.css";
import { useDashboardData } from "../../hooks/useDashboardData";
import { HISTORICO_VAZIO, PERIODOS, RESUMO_VAZIO } from "./constants";
import { capitalizar, nomeDoMes } from "./formatadores";
import { useMesAtivo } from "./useMesAtivo";
import { AlertaOrcamento } from "../../components/Dashboard/AlertaOrcamento";
import { DistribuicaoGastos } from "../../components/Dashboard/DistribuicaoGastos";
import { KpiCard } from "../../components/Dashboard/KpiCard";
import { AvisoErro, SecaoCarregavel } from "../../components/Dashboard/Layout";
import { MetaRealizado } from "../../components/Dashboard/MetaRealizado";
import { ReceitaDespesaChart } from "../../components/Dashboard/ReceitaDespesaChart";
import { SaldoMensalChart } from "../../components/Dashboard/SaldoMensalChart";
import { TopCategorias } from "../../components/Dashboard/TopCategorias";
import { FiltroSelect } from "../../components/Header/FiltroSelect";
import { Header } from "../../components/Header/Header";
import { IconeCalendario } from "../../components/Header/Icones";

export function Dashboard() {
  const [periodo, setPeriodo] = useState(
    PERIODOS[PERIODOS.length - 1]?.valor ?? "",
  );
  const dados = useDashboardData(periodo);
  const resumo = dados.resumo ?? RESUMO_VAZIO;
  const historico = dados.historico ?? HISTORICO_VAZIO;
  const { mesAtivo, ativarMes, limparMes } = useMesAtivo(historico, periodo);

  const ano = Number(periodo.slice(0, 4));
  const mes = Number(periodo.slice(5, 7));
  const nomeMesAtual = nomeDoMes(ano, mes);
  const nomeMesAnterior = nomeDoMes(ano, mes - 1);
  const rotuloPeriodo = `${capitalizar(nomeMesAtual)} de ${ano}`;

  const { receita, despesa, saldo } = resumo.kpis;
  const categorias = [...resumo.despesaPorCategoria].sort(
    (a, b) => b.valor - a.valor,
  );

  function trocarPeriodo(valor: string) {
    setPeriodo(valor);
    limparMes();
  }

  return (
    <div className={styles.page}>
      <Header>
        <FiltroSelect
          icone={<IconeCalendario />}
          rotulo="Período"
          valor={periodo}
          opcoes={PERIODOS}
          onChange={trocarPeriodo}
        />
      </Header>

      {dados.erro && (
        <AvisoErro
          mensagem={dados.erro}
          onTentarNovamente={dados.tentarNovamente}
        />
      )}

      <SecaoCarregavel
        className={styles.cardsGrid}
        carregando={dados.carregando}
      >
        <KpiCard
          variante="receita"
          titulo="Receita"
          subtitulo={`Tudo o que entrou em ${nomeMesAtual}`}
          valor={receita.valor}
          variacao={receita.diferencaPorcentagem}
          valorAnterior={receita.totalReceitaMesAnterior}
          nomeMesAnterior={nomeMesAnterior}
        />
        <KpiCard
          variante="despesa"
          titulo="Despesa"
          subtitulo={`Tudo o que saiu em ${nomeMesAtual}`}
          valor={despesa.valor}
          variacao={despesa.diferencaPorcentagem}
          valorAnterior={despesa.totalDespesaMesAnterior}
          nomeMesAnterior={nomeMesAnterior}
        />
        <KpiCard
          variante="saldo"
          titulo="Saldo final"
          subtitulo={`Receita − despesa de ${nomeMesAtual}`}
          valor={saldo.valor}
          variacao={saldo.diferencaPorcentagem}
          valorAnterior={saldo.saldoFinalMesAnterior}
          nomeMesAnterior={nomeMesAnterior}
        />
        <AlertaOrcamento orcamentos={resumo.comparacaoOrcamento} />
      </SecaoCarregavel>

      <SecaoCarregavel
        className={styles.graficosGrid}
        carregando={dados.carregando}
      >
        <ReceitaDespesaChart
          historico={historico}
          mesAtivo={mesAtivo}
          onAtivarMes={ativarMes}
          onSairMes={limparMes}
        />
        <SaldoMensalChart
          historico={historico}
          mesAtivo={mesAtivo}
          onAtivarMes={ativarMes}
          onSairMes={limparMes}
        />
      </SecaoCarregavel>

      <SecaoCarregavel
        className={styles.distGrid}
        carregando={dados.carregando}
      >
        <DistribuicaoGastos
          categorias={categorias}
          totalDespesa={despesa.valor}
          rotuloPeriodo={rotuloPeriodo}
        />
        <TopCategorias
          categorias={categorias}
          totalDespesa={despesa.valor}
          rotuloPeriodo={rotuloPeriodo}
        />
        <MetaRealizado orcamentos={resumo.comparacaoOrcamento} />
      </SecaoCarregavel>
    </div>
  );
}
