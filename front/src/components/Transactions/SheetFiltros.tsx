import { useId, useState } from "react";
import styles from "./SheetFiltros.module.css";
import { Modal } from "../Modal/Modal";

type Opcao = { valor: string; rotulo: string };

export type OpcaoSubcategoria = Opcao & { categoria: string };

export type Filtros = {
  categoria: string;
  subcategoria: string;
  pagamento: string;
  // Data da compra, "AAAA-MM-DD". Quando preenchida, substitui o vencimento.
  de: string;
  ate: string;
};

type Props = {
  filtros: Filtros;
  opcoesCategoria: Opcao[];
  opcoesSubcategoria: OpcaoSubcategoria[];
  opcoesPagamento: Opcao[];
  onAplicar: (filtros: Filtros) => void;
  onFechar: () => void;
};

export function SheetFiltros({
  filtros,
  opcoesCategoria,
  opcoesSubcategoria,
  opcoesPagamento,
  onAplicar,
  onFechar,
}: Props) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const [rascunho, setRascunho] = useState(filtros);

  const subcategoriasDaCategoria = opcoesSubcategoria.filter(
    (o) => o.categoria === rascunho.categoria,
  );
  const intervaloInvalido =
    !!rascunho.de && !!rascunho.ate && rascunho.de > rascunho.ate;

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
          if (!intervaloInvalido) onAplicar(rascunho);
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
                de: "",
                ate: "",
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
        <fieldset className={styles.intervalo}>
          <legend>
            Data da compra
            <span className={styles.apoio}>Quando você fez a compra</span>
          </legend>
          <div className={styles.campo}>
            <label htmlFor={`${id}-de`}>De</label>
            <input
              id={`${id}-de`}
              type="date"
              value={rascunho.de}
              max={rascunho.ate || undefined}
              aria-invalid={intervaloInvalido}
              aria-describedby={intervaloInvalido ? `${id}-erro` : undefined}
              onChange={(e) => setRascunho({ ...rascunho, de: e.target.value })}
            />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`${id}-ate`}>Até</label>
            <input
              id={`${id}-ate`}
              type="date"
              value={rascunho.ate}
              min={rascunho.de || undefined}
              aria-invalid={intervaloInvalido}
              aria-describedby={intervaloInvalido ? `${id}-erro` : undefined}
              onChange={(e) =>
                setRascunho({ ...rascunho, ate: e.target.value })
              }
            />
          </div>
          {intervaloInvalido && (
            <p className={styles.erro} id={`${id}-erro`} role="alert">
              A data inicial não pode ser depois da final.
            </p>
          )}
        </fieldset>

        <button
          type="submit"
          className={styles.aplicar}
          disabled={intervaloInvalido}
        >
          Aplicar
        </button>
      </form>
    </Modal>
  );
}
