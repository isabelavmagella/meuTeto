import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import styles from "../../pages/Dashboard/Dashboard.module.css";
import type { ResumoMensal } from "../../pages/Dashboard/api";
import { moeda, percentual } from "../../pages/Dashboard/formatadores";
import { GraficoCard, RotuloPeriodo } from "./Layout";

type Props = {
  categorias: ResumoMensal["despesaPorCategoria"];
  totalDespesa: number;
  rotuloPeriodo: string;
};

export function DistribuicaoGastos({
  categorias,
  totalDespesa,
  rotuloPeriodo,
}: Props) {
  const totalGastos = totalDespesa || 1;

  return (
    <GraficoCard
      titulo="Distribuição de gastos"
      extra={<RotuloPeriodo>{rotuloPeriodo}</RotuloPeriodo>}
    >
      <div className={styles.donutLayout}>
        <div className={styles.donutArea}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categorias}
                dataKey="valor"
                nameKey="nome"
                innerRadius="64%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="var(--surface)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {categorias.map((c) => (
                  <Cell key={c.nome} fill={c.cor} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className={styles.donutCentro}>
            <strong className={styles.donutTotal}>
              {moeda.format(totalDespesa)}
            </strong>
            <span className={styles.donutRotulo}>total de gastos</span>
          </div>
        </div>

        <ul className={styles.donutLegenda}>
          {categorias.map((c) => (
            <li key={c.nome}>
              <span
                className={styles.donutMarca}
                style={{ background: c.cor }}
              />
              <span className={styles.donutNome}>{c.nome}</span>
              <span className={styles.donutPercent}>
                {percentual.format((c.valor / totalGastos) * 100)}%
              </span>
              <span className={styles.donutValor}>{moeda.format(c.valor)}</span>
            </li>
          ))}
        </ul>
      </div>
    </GraficoCard>
  );
}
