import styles from "../../pages/Dashboard/Dashboard.module.css";
import { PERIODOS } from "../../pages/Dashboard/constants";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import {
  IconeCalendario,
  IconePainel,
  IconeTransacoes,
  LogoMeuTeto,
} from "./Icones";

export type Aba = "painel" | "transacoes";

const ABAS = [
  { id: "painel", rotulo: "Painel", Icone: IconePainel },
  { id: "transacoes", rotulo: "Transações", Icone: IconeTransacoes },
] as const;

type Props = {
  aba: Aba;
  onTrocarAba: (aba: Aba) => void;
  periodo: string;
  onTrocarPeriodo: (periodo: string) => void;
};

export function DashboardHeader({
  aba,
  onTrocarAba,
  periodo,
  onTrocarPeriodo,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logo}>
          <LogoMeuTeto className={styles.logo} />
          <span>
            Meu <strong>Teto</strong>
          </span>
        </div>

        <nav className={styles.tabs} aria-label="Navegação principal">
          {ABAS.map(({ id, rotulo, Icone }) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab} ${aba === id ? styles.tabAtiva : ""}`}
              onClick={() => onTrocarAba(id)}
            >
              <Icone />
              {rotulo}
            </button>
          ))}
        </nav>
      </div>

      <div className={styles.headerRight}>
        <label className={styles.periodo}>
          <span>Período</span>
          <div className={styles.selectPeriodo}>
            <IconeCalendario />
            <select
              value={periodo}
              onChange={(e) => onTrocarPeriodo(e.target.value)}
            >
              {PERIODOS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </div>
        </label>

        <ThemeToggle variante="header" />
      </div>
    </header>
  );
}
