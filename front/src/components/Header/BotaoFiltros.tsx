import styles from "./Header.module.css";
import { IconeEtiqueta } from "./Icones";

type Props = {
  ativos: number;
  onClick: () => void;
};

export function BotaoFiltros({ ativos, onClick }: Props) {
  return (
    <button
      type="button"
      className={`${styles.filtro} ${styles.filtroBotao} ${ativos > 0 ? styles.filtroBotaoAtivo : ""}`}
      aria-label={
        ativos > 0 ? `Filtros, ${ativos} ${ativos === 1 ? "ativo" : "ativos"}` : "Filtros"
      }
      onClick={onClick}
    >
      <IconeEtiqueta />
      <span className={styles.filtroValor}>Filtros</span>
      {ativos > 0 && (
        <span className={styles.filtroContador} aria-hidden="true">
          {ativos}
        </span>
      )}
    </button>
  );
}
