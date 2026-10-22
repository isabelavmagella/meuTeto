import styles from "../../pages/Dashboard/Dashboard.module.css";
import { moeda, percentual } from "../../pages/Dashboard/formatadores";

type Variante = {
  card: string;
  icone: string;
  simbolo: string;
  subirEhRuim?: boolean;
};

const VARIANTES: Record<"receita" | "despesa" | "saldo", Variante> = {
  receita: { card: styles.receita, icone: styles.iconSuccess, simbolo: "+" },
  despesa: {
    card: styles.despesa,
    icone: styles.iconDanger,
    simbolo: "−",
    subirEhRuim: true,
  },
  saldo: { card: styles.saldo, icone: styles.iconBrand, simbolo: "=" },
};

type Props = {
  variante: keyof typeof VARIANTES;
  titulo: string;
  subtitulo: string;
  valor: number;
  variacao: number;
  valorAnterior: number;
  nomeMesAnterior: string;
};

export function KpiCard({
  variante,
  titulo,
  subtitulo,
  valor,
  variacao,
  valorAnterior,
  nomeMesAnterior,
}: Props) {
  const v = VARIANTES[variante];
  const bom = v.subirEhRuim ? variacao <= 0 : variacao >= 0;

  return (
    <article className={`${styles.card} ${v.card}`}>
      <header className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{titulo}</h3>
          <p className={styles.cardSubtitle}>{subtitulo}</p>
        </div>
        <span className={`${styles.cardIcon} ${v.icone}`}>{v.simbolo}</span>
      </header>

      <strong className={styles.cardValue}>{moeda.format(valor)}</strong>

      <footer className={styles.cardFooter}>
        <span
          className={`${styles.badge} ${bom ? styles.badgeSuccess : styles.badgeDanger}`}
        >
          {`${variacao >= 0 ? "▲" : "▼"} ${percentual.format(Math.abs(variacao))}%`}
        </span>
        <span>
          vs {nomeMesAnterior} ({moeda.format(valorAnterior)})
        </span>
      </footer>
    </article>
  );
}
