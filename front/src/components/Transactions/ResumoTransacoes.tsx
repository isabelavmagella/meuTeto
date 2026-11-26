import styles from "./ResumoTransacoes.module.css";
import { moeda } from "../../pages/Dashboard/formatadores";
import { IconeLixeira, IconeLupa, IconeMais } from "./Icones";

type Props = {
  quantidade: number;
  receitas: number;
  despesas: number;
  selecionadas: number;
  busca: string;
  onBuscar: (texto: string) => void;
  onAdicionar?: () => void;
  onApagarSelecionadas?: () => void;
};

function comSinal(valor: number) {
  return `${valor < 0 ? "−" : "+"}${moeda.format(Math.abs(valor))}`;
}

export function ResumoTransacoes({
  quantidade,
  receitas,
  despesas,
  selecionadas,
  busca,
  onBuscar,
  onAdicionar,
  onApagarSelecionadas,
}: Props) {
  const saldo = receitas - despesas;

  return (
    <section className={styles.barra}>
      <div className={styles.esquerda}>
        <button
          type="button"
          className={styles.adicionar}
          onClick={onAdicionar}
        >
          <IconeMais />
          Adicionar transação
        </button>

        <div className={styles.busca} role="search">
          <IconeLupa />
          <input
            type="search"
            aria-label="Buscar na descrição"
            placeholder="Buscar na descrição"
            maxLength={100}
            value={busca}
            onChange={(e) => onBuscar(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && busca && onBuscar("")}
          />
          {busca && (
            <button
              type="button"
              className={styles.limparBusca}
              aria-label="Limpar busca"
              onClick={() => onBuscar("")}
            >
              ✕
            </button>
          )}
        </div>

        <dl className={styles.totais}>
          <div className={styles.quantidade}>
            <dt className={styles.oculto}>Quantidade</dt>
            <dd>
              {quantidade} {quantidade === 1 ? "transação" : "transações"}
            </dd>
          </div>
          <div>
            <dt>Receitas</dt>
            <dd className={styles.receita}>{comSinal(receitas)}</dd>
          </div>
          <div>
            <dt>Despesas</dt>
            <dd className={styles.despesa}>{comSinal(-despesas)}</dd>
          </div>
          <div>
            <dt>Saldo</dt>
            <dd className={saldo < 0 ? styles.despesa : styles.saldo}>
              {comSinal(saldo)}
            </dd>
          </div>
        </dl>
      </div>

      <div className={styles.direita}>
        <span className={styles.dica}>
          Marque as linhas para apagar várias de uma vez
        </span>
        <button
          type="button"
          className={styles.apagar}
          disabled={selecionadas === 0}
          onClick={onApagarSelecionadas}
        >
          <IconeLixeira />
          Apagar selecionadas
          {selecionadas > 0 && ` (${selecionadas})`}
        </button>
      </div>

      <button
        type="button"
        className={styles.fab}
        aria-label="Adicionar transação"
        onClick={onAdicionar}
      >
        <IconeMais />
      </button>
    </section>
  );
}
