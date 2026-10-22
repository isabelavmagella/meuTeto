import styles from "../../pages/Dashboard/Dashboard.module.css";
import type { ResumoMensal } from "../../pages/Dashboard/api";
import { moedaInteira } from "../../pages/Dashboard/formatadores";
import { GraficoCard, Legenda } from "./Layout";

type Props = {
  orcamentos: ResumoMensal["comparacaoOrcamento"];
};

export function MetaRealizado({ orcamentos }: Props) {
  const ordenados = [...orcamentos].sort(
    (a, b) => b.porcentagemUsada - a.porcentagemUsada,
  );

  return (
    <GraficoCard
      titulo="Meta x realizado"
      extra={
        <Legenda
          itens={[
            { rotulo: "Ok", forma: "redonda", cor: styles.corOk },
            { rotulo: "Atenção", forma: "redonda", cor: styles.corAtencao },
            { rotulo: "Estourou", forma: "redonda", cor: styles.corEstourou },
          ]}
        />
      }
    >
      <div className={styles.metaLista}>
        {ordenados.map((b) => {
          const estourou = b.ultrapassou;
          const atencao = !estourou && b.porcentagemUsada > 80;
          const escala = Math.max(100, b.porcentagemUsada);

          return (
            <div key={b.nomeCategoria} className={styles.metaItem}>
              <div className={styles.metaTopo}>
                <span className={styles.metaNome}>{b.nomeCategoria}</span>
                <span className={styles.metaDetalhe}>
                  {moedaInteira.format(b.valorGasto)} de{" "}
                  {moedaInteira.format(b.limiteOrcamento)}
                </span>
                <strong
                  className={`${styles.metaPercent} ${estourou ? styles.textoEstourou : atencao ? styles.textoAtencao : styles.textoOk}`}
                >
                  {Math.round(b.porcentagemUsada)}%
                </strong>
              </div>

              <div className={styles.metaTrilho}>
                <div
                  className={`${styles.metaBarra} ${estourou ? styles.corEstourou : atencao ? styles.corAtencao : styles.corOk}`}
                  style={{
                    width: `${(b.porcentagemUsada / escala) * 100}%`,
                  }}
                />
                {estourou && (
                  <i
                    className={styles.metaMarcador}
                    style={{ left: `${(100 / escala) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GraficoCard>
  );
}
