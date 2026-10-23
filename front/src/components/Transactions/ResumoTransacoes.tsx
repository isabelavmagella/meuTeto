import styles from "./ResumoTransacoes.module.css";
import { moeda } from "../../pages/Dashboard/formatadores";
import { IconeLixeira, IconeMais } from "./Icones";

type Props = {
  quantidade: number;
  receitas: number;
  despesas: number;
  selecionadas: number;
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
    </section>
  );
}
