import styles from "./TabelaTransacoes.module.css";
import { IconeChevron } from "./Icones";

type Props = {
  pagina: number;
  totalPaginas: number;
  onTrocar: (pagina: number) => void;
};

export function Paginacao({ pagina, totalPaginas, onTrocar }: Props) {
  if (totalPaginas <= 1) return null;

  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);

  return (
    <nav className={styles.paginacao} aria-label="Paginação">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={pagina === 1}
        onClick={() => onTrocar(pagina - 1)}
      >
        <IconeChevron direcao="esquerda" />
      </button>

      {paginas.map((p) => (
        <button
          key={p}
          type="button"
          className={p === pagina ? styles.paginaAtual : ""}
          aria-current={p === pagina ? "page" : undefined}
          onClick={() => onTrocar(p)}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        aria-label="Próxima página"
        disabled={pagina === totalPaginas}
        onClick={() => onTrocar(pagina + 1)}
      >
        <IconeChevron direcao="direita" />
      </button>
    </nav>
  );
}
