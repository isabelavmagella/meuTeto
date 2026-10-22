import styles from "../../pages/Dashboard/Dashboard.module.css";
import type { ResumoMensal } from "../../pages/Dashboard/api";
import { moedaInteira } from "../../pages/Dashboard/formatadores";

type Props = {
  orcamentos: ResumoMensal["comparacaoOrcamento"];
};

export function AlertaOrcamento({ orcamentos }: Props) {
  const alertas = orcamentos
    .filter((b) => b.porcentagemUsada > 80)
    .sort((a, b) => b.porcentagemUsada - a.porcentagemUsada);

  return (
    <article className={`${styles.card} ${styles.alerta}`}>
      <header className={styles.alertHeader}>
        <h3 className={`${styles.cardTitle} ${styles.alertTitle}`}>
          Alerta de orçamento
        </h3>
        <span className={styles.alertCount}>
          {alertas.length} acima de 80%
        </span>
      </header>

      <div className={styles.alertList}>
        {alertas.length === 0 && (
          <p className={styles.alertDetail}>Nenhum orçamento acima de 80%.</p>
        )}

        {alertas.map((b) => (
          <div
            key={b.nomeCategoria}
            className={`${styles.alertItem} ${b.ultrapassou ? styles.alertItemDanger : styles.alertItemWarning}`}
          >
            <span
              className={`${styles.alertDot} ${b.ultrapassou ? styles.alertDotDanger : styles.alertDotWarning}`}
            >
              !
            </span>
            <div className={styles.alertInfo}>
              <p className={styles.alertName}>{b.nomeCategoria}</p>
              <p className={styles.alertDetail}>
                {moedaInteira.format(b.valorGasto)} de{" "}
                {moedaInteira.format(b.limiteOrcamento)}
              </p>
            </div>
            <div className={styles.alertStatus}>
              <p
                className={`${styles.alertPercent} ${b.ultrapassou ? styles.alertPercentDanger : styles.alertPercentWarning}`}
              >
                {Math.round(b.porcentagemUsada)}%
              </p>
              <p
                className={`${styles.alertLabel} ${b.ultrapassou ? styles.alertLabelDanger : styles.alertLabelWarning}`}
              >
                {b.ultrapassou ? "estourou" : "atenção"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
