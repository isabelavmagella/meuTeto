import { useId, useState } from "react";
import styles from "./SheetFiltros.module.css";
import { Modal } from "../Modal/Modal";

type Opcao = { valor: string; rotulo: string };

export type OpcaoSubcategoria = Opcao & { categoria: string };

export type Filtros = {
  categoria: string;
  subcategoria: string;
  pagamento: string;
  periodo: string;
};

type Props = {
  filtros: Filtros;
  opcoesCategoria: Opcao[];
  opcoesSubcategoria: OpcaoSubcategoria[];
  opcoesPagamento: Opcao[];
  opcoesPeriodo: Opcao[];
  onAplicar: (filtros: Filtros) => void;
  onFechar: () => void;
};

export function SheetFiltros({
  filtros,
  opcoesCategoria,
  opcoesSubcategoria,
  opcoesPagamento,
  opcoesPeriodo,
  onAplicar,
  onFechar,
}: Props) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const [rascunho, setRascunho] = useState(filtros);

  const subcategoriasDaCategoria = opcoesSubcategoria.filter(
    (o) => o.categoria === rascunho.categoria,
  );

  function campo(
    chave: keyof Filtros,
    rotulo: string,
    opcoes: Opcao[],
    extra: { autofocus?: boolean; desabilitado?: boolean } = {},
  ) {
    return (
      <div className={styles.campo}>
        <label htmlFor={`${id}-${chave}`}>{rotulo}</label>
        <select
          id={`${id}-${chave}`}
          data-autofocus={extra.autofocus || undefined}
          disabled={extra.desabilitado}
          value={rascunho[chave]}
          onChange={(e) =>
            setRascunho({
              ...rascunho,
              [chave]: e.target.value,
              ...(chave === "categoria" && { subcategoria: "" }),
            })
          }
        >
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>
    );
  }

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
              setRascunho({
                ...rascunho,
                categoria: "",
                subcategoria: "",
                pagamento: "",
              })
            }
          >
            Limpar
          </button>
        </header>

        {campo("categoria", "Categoria", opcoesCategoria, { autofocus: true })}
        {campo(
          "subcategoria",
          "Subcategoria",
          [
            {
              valor: "",
              rotulo: !rascunho.categoria
                ? "Escolha a categoria antes"
                : subcategoriasDaCategoria.length === 0
                  ? "Nenhuma nesta categoria"
                  : "Todas",
            },
            ...subcategoriasDaCategoria,
          ],
          { desabilitado: subcategoriasDaCategoria.length === 0 },
        )}
        {campo("pagamento", "Pagamento", opcoesPagamento)}
        {campo("periodo", "Mês", opcoesPeriodo)}

        <button type="submit" className={styles.aplicar}>
          Aplicar
        </button>
      </form>
    </Modal>
  );
}
