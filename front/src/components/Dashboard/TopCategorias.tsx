import styles from "../../pages/Dashboard/Dashboard.module.css";
import type { ResumoMensal } from "../../pages/Dashboard/api";
import { moeda, percentual } from "../../pages/Dashboard/formatadores";
import { GraficoCard, RotuloPeriodo } from "./Layout";

type Props = {
  categorias: ResumoMensal["despesaPorCategoria"];
  totalDespesa: number;
  rotuloPeriodo: string;
};

export function TopCategorias({
  categorias,
  totalDespesa,
  rotuloPeriodo,
}: Props) {
  const totalGastos = totalDespesa || 1;
  const top5 = categorias.slice(0, 5);
  const maxTop5 = top5[0]?.valor || 1;

  return (
    <GraficoCard
      titulo="Top 5 categorias"
      extra={<RotuloPeriodo>{rotuloPeriodo}</RotuloPeriodo>}
    >
      <div className={styles.topLista}>
        {top5.map((c) => {
          const proporcao = c.valor / maxTop5;
          const dentro = proporcao >= 0.45;

          return (
            <div key={c.nome} className={styles.topItem}>
              <span className={styles.topNome}>{c.nome}</span>
              <div className={styles.topArea}>
                <span
                  className={styles.topBarra}
                  style={{
                    width: `${proporcao * 60}%`,
                    background: c.cor,
                  }}
                >
                  {dentro && moeda.format(c.valor)}
                </span>
                {!dentro && (
                  <span className={styles.topValor}>
                    {moeda.format(c.valor)}
                  </span>
                )}
                <span className={styles.topPercent}>
                  {percentual.format((c.valor / totalGastos) * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </GraficoCard>
  );
}
