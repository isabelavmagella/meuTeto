import { useId, useState } from "react";
import styles from "./SheetFiltros.module.css";
import { Modal } from "../Modal/Modal";

type Opcao = { valor: string; rotulo: string };

export type Filtros = {
  categoria: string;
  pagamento: string;
  periodo: string;
};

type Props = {
  filtros: Filtros;
  opcoesCategoria: Opcao[];
  opcoesPagamento: Opcao[];
  opcoesPeriodo: Opcao[];
  onAplicar: (filtros: Filtros) => void;
  onFechar: () => void;
};

export function SheetFiltros({
  filtros,
  opcoesCategoria,
  opcoesPagamento,
  opcoesPeriodo,
  onAplicar,
  onFechar,
}: Props) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const [rascunho, setRascunho] = useState(filtros);

  const campos = [
    { chave: "categoria", rotulo: "Categoria", opcoes: opcoesCategoria },
    { chave: "pagamento", rotulo: "Pagamento", opcoes: opcoesPagamento },
    { chave: "periodo", rotulo: "Mês", opcoes: opcoesPeriodo },
  ] as const;

  return (
    <Modal tituloId={tituloId} variante="sheet" onFechar={onFechar}>
      <form
        className={styles.sheet}
        onSubmit={(e) => {
          e.preventDefault();
          onAplicar(rascunho);
        }}
      >
        <span className={styles.alca} aria-hidden="true" />

        <header className={styles.cabecalho}>
          <h2 id={tituloId}>Filtros</h2>
          <button
            type="button"
            className={styles.limpar}
            onClick={() =>
              setRascunho({ ...rascunho, categoria: "", pagamento: "" })
            }
          >
            Limpar
          </button>
        </header>

        {campos.map(({ chave, rotulo, opcoes }, i) => (
          <div key={chave} className={styles.campo}>
            <label htmlFor={`${id}-${chave}`}>{rotulo}</label>
            <select
              id={`${id}-${chave}`}
              data-autofocus={i === 0 ? true : undefined}
              value={rascunho[chave]}
              onChange={(e) =>
                setRascunho({ ...rascunho, [chave]: e.target.value })
              }
            >
              {opcoes.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </div>
        ))}

        <button type="submit" className={styles.aplicar}>
          Aplicar
        </button>
      </form>
    </Modal>
  );
}
