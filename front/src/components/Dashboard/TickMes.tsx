import type { XAxisTickContentProps } from "recharts";
import styles from "../../pages/Dashboard/Dashboard.module.css";

type Props = XAxisTickContentProps & { nomeAtivo?: string };

export function TickMes({ x, y, payload, nomeAtivo }: Props) {
  return (
    <text
      x={x}
      y={y}
      dy={14}
      textAnchor="middle"
      className={`${styles.mesLabel} ${String(payload.value) === nomeAtivo ? styles.mesLabelAtivo : ""}`}
    >
      {String(payload.value)}
    </text>
  );
}
