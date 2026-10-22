import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "../../pages/Dashboard/Dashboard.module.css";
import type { Mes } from "../../pages/Dashboard/api";
import {
  ALTURA_GRAFICO,
  LARGURA_EIXO_Y,
  MARGEM_GRAFICO,
} from "../../pages/Dashboard/constants";
import { formatarEixo, moeda } from "../../pages/Dashboard/formatadores";
import { escalaBarras, temDados } from "../../pages/Dashboard/graficos";
import { GraficoCard, Legenda } from "./Layout";
import { TickMes } from "./TickMes";

type Props = {
  historico: Mes[];
  mesAtivo: number;
  onAtivarMes: (state: unknown) => void;
  onSairMes: () => void;
};

export function ReceitaDespesaChart({
  historico,
  mesAtivo,
  onAtivarMes,
  onSairMes,
}: Props) {
  const nomeAtivo = historico[mesAtivo]?.nomeMes.toLowerCase();
  const { topo, ticks } = escalaBarras(historico);

  const dados = historico.map((m) => ({
    mes: m.nomeMes.toLowerCase(),
    receita: temDados(m) ? m.receita : null,
    despesa: temDados(m) ? m.despesa : null,
  }));

  return (
    <GraficoCard
      titulo="Receita x despesa"
      extra={
        <Legenda
          itens={[
            { rotulo: "Receita", forma: "quadrada", cor: styles.corReceita },
            { rotulo: "Despesa", forma: "quadrada", cor: styles.corDespesa },
          ]}
        />
      }
    >
      <div className={styles.grafico}>
        <ResponsiveContainer width="100%" height={ALTURA_GRAFICO}>
          <BarChart
            data={dados}
            margin={MARGEM_GRAFICO}
            barGap={2}
            barCategoryGap="28%"
            onMouseMove={onAtivarMes}
            onClick={onAtivarMes}
            onMouseLeave={onSairMes}
          >
            <CartesianGrid vertical={false} stroke="var(--meter-empty)" />

            <XAxis
              dataKey="mes"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={(props) => <TickMes {...props} nomeAtivo={nomeAtivo} />}
            />
            <YAxis
              width={LARGURA_EIXO_Y}
              axisLine={false}
              tickLine={false}
              domain={[0, topo]}
              ticks={ticks}
              tickFormatter={formatarEixo}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            />

            {nomeAtivo && (
              <ReferenceArea
                x1={nomeAtivo}
                x2={nomeAtivo}
                fill="var(--brand-soft)"
                fillOpacity={1}
                stroke="none"
                ifOverflow="visible"
              />
            )}

            <Tooltip
              cursor={false}
              content={({ active, label }) => {
                if (!active) return null;
                const m = historico.find(
                  (h) => h.nomeMes.toLowerCase() === String(label),
                );
                if (!m || !temDados(m)) return null;
                return (
                  <div className={styles.tooltip}>
                    <strong className={styles.tooltipTitulo}>
                      {m.nomeMes}
                    </strong>
                    <span className={styles.tooltipLinha}>
                      <i
                        className={`${styles.marca} ${styles.marcaQuadrada} ${styles.corReceita}`}
                      />
                      Receita {moeda.format(m.receita)}
                    </span>
                    <span className={styles.tooltipLinha}>
                      <i
                        className={`${styles.marca} ${styles.marcaQuadrada} ${styles.corDespesa}`}
                      />
                      Despesa {moeda.format(m.despesa)}
                    </span>
                  </div>
                );
              }}
            />

            <Bar
              dataKey="receita"
              fill="var(--success)"
              radius={[2, 2, 0, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            />
            <Bar
              dataKey="despesa"
              fill="var(--danger)"
              radius={[2, 2, 0, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GraficoCard>
  );
}
