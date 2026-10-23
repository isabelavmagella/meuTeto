import styles from "./Header.module.css";
import { IconeEtiqueta } from "./Icones";
import { IconeChevron } from "../Transactions/Icones";

type Opcao = { valor: string; rotulo: string };

type Props = {
  periodo: string;
  opcoesPeriodo: Opcao[];
  onTrocarPeriodo: (periodo: string) => void;
  filtrosAtivos?: number;
  onAbrirFiltros?: () => void;
};

export function BarraMobile({
  periodo,
  opcoesPeriodo,
  onTrocarPeriodo,
  filtrosAtivos = 0,
  onAbrirFiltros,
}: Props) {
  const meses = opcoesPeriodo.filter((o) => o.valor);
  const indice = meses.findIndex((o) => o.valor === periodo);
  const anterior = indice === -1 ? meses[meses.length - 1] : meses[indice - 1];
  const proximo = indice === -1 ? undefined : meses[indice + 1];
  const rotulo =
    opcoesPeriodo.find((o) => o.valor === periodo)?.rotulo ?? "Todos";

  return (
    <div className={styles.barraMobile}>
      <div className={styles.mes}>
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={!anterior}
          onClick={() => anterior && onTrocarPeriodo(anterior.valor)}
        >
          <IconeChevron direcao="esquerda" />
        </button>

        <label className={styles.mesAtual}>
          {periodo ? rotulo : "Todos os meses"}
          <select
            aria-label="Mês"
            value={periodo}
            onChange={(e) => onTrocarPeriodo(e.target.value)}
          >
            {opcoesPeriodo.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          aria-label="Próximo mês"
          disabled={!proximo}
          onClick={() => proximo && onTrocarPeriodo(proximo.valor)}
        >
          <IconeChevron direcao="direita" />
        </button>
      </div>

      {onAbrirFiltros && (
        <button
          type="button"
          className={`${styles.botaoFiltros} ${filtrosAtivos > 0 ? styles.botaoFiltrosAtivo : ""}`}
          onClick={onAbrirFiltros}
        >
          <IconeEtiqueta />
          Filtros{filtrosAtivos > 0 && ` · ${filtrosAtivos}`}
        </button>
      )}
    </div>
  );
}
