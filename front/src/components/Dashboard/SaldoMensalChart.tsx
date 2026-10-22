import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
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
import { escalaSaldo, temDados } from "../../pages/Dashboard/graficos";
import { GraficoCard, Legenda } from "./Layout";
import { TickMes } from "./TickMes";

type Props = {
  historico: Mes[];
  mesAtivo: number;
  onAtivarMes: (state: unknown) => void;
  onSairMes: () => void;
};

export function SaldoMensalChart({
  historico,
  mesAtivo,
  onAtivarMes,
  onSairMes,
}: Props) {
  const nomeAtivo = historico[mesAtivo]?.nomeMes.toLowerCase();
  const { base, topo, ticks } = escalaSaldo(historico);

  const dados = historico.map((m, i) => ({
    mes: m.nomeMes.toLowerCase(),
    saldo: temDados(m) ? m.saldoFinal : null,
    destaque: i === mesAtivo ? [base, topo] : null,
  }));

  return (
    <GraficoCard
      titulo="Saldo final por mês"
      extra={
        <Legenda
          itens={[
            { rotulo: "Mês positivo", forma: "redonda", cor: styles.corPositivo },
            { rotulo: "Mês negativo", forma: "redonda", cor: styles.corNegativo },
          ]}
        />
      }
    >
      <div className={styles.grafico}>
        <ResponsiveContainer width="100%" height={ALTURA_GRAFICO}>
          <ComposedChart
            data={dados}
            margin={MARGEM_GRAFICO}
            barCategoryGap="3%"
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
              domain={[base, topo]}
              ticks={ticks}
              tickFormatter={formatarEixo}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            />

            <ReferenceArea
              y1={base}
              y2={0}
              fill="var(--danger-soft)"
              fillOpacity={1}
              stroke="none"
              ifOverflow="visible"
            />

            <Bar
              dataKey="destaque"
              fill="var(--brand-soft)"
              radius={6}
              isAnimationActive={false}
              legendType="none"
            />

            <ReferenceLine y={0} stroke="var(--border)" />

            <Tooltip cursor={false} content={() => null} />

            <Line
              dataKey="saldo"
              type="linear"
              stroke="var(--brand)"
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
              dot={(props) => {
                const { cx, cy, payload } = props as unknown as {
                  cx?: number;
                  cy?: number;
                  payload?: { mes: string; saldo: number | null };
                };
                if (
                  cx === undefined ||
                  cy === undefined ||
                  !payload ||
                  payload.saldo === null
                ) {
                  return <g key={payload?.mes ?? "vazio"} />;
                }

                const i = historico.findIndex(
                  (m) => m.nomeMes.toLowerCase() === payload.mes,
                );
                const ativo = i === mesAtivo;

                return (
                  <g key={payload.mes}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={ativo ? 5 : 3.5}
                      className={`${payload.saldo < 0 ? styles.pontoNegativo : styles.pontoPositivo} ${ativo ? styles.pontoAtivo : ""}`}
                    />
                    {ativo && (
                      <text
                        x={cx}
                        y={cy - 12}
                        textAnchor={
                          i >= 10 ? "end" : i === 0 ? "start" : "middle"
                        }
                        className={styles.valorAtivo}
                      >
                        {moeda.format(payload.saldo)}
                      </text>
                    )}
                  </g>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </GraficoCard>
  );
}
