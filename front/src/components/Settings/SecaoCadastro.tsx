import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./SecaoCadastro.module.css";
import { IconeLapis, IconeLixeira, IconeMais } from "../Transactions/Icones";

type Item = { id: number; nome: string };

export type Coluna<T> = {
  titulo: string;
  render: (item: T) => ReactNode;
  largura?: string;
};

type Props<T extends Item> = {
  titulo: string;
  contagem: string;
  rotuloAdicionar: string;
  vazio: string;
  itens: T[];
  colunas: Coluna<T>[];
  carregando: boolean;
  onAdicionar: () => void;
  onEditar: (item: T) => void;
  onApagar: (itens: T[]) => Promise<boolean>;
};

export function SecaoCadastro<T extends Item>({
  titulo,
  contagem,
  rotuloAdicionar,
  vazio,
  itens,
  colunas,
  carregando,
  onAdicionar,
  onEditar,
  onApagar,
}: Props<T>) {
  const tituloId = useId();
  const marcarTodas = useRef<HTMLInputElement>(null);
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());

  const selecionados = itens.filter((i) => marcadas.has(i.id));
  const todasMarcadas =
    itens.length > 0 && selecionados.length === itens.length;

  useEffect(() => {
    if (marcarTodas.current) {
      marcarTodas.current.indeterminate =
        selecionados.length > 0 && !todasMarcadas;
    }
  }, [selecionados.length, todasMarcadas]);

  function alternar(id: number) {
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  async function apagar(lista: T[]) {
    if (await onApagar(lista)) setMarcadas(new Set());
  }

  return (
    <section className={styles.secao} aria-labelledby={tituloId}>
      <header className={styles.cabecalho}>
        <div>
          <h2 id={tituloId} className={styles.titulo}>
            {titulo}
          </h2>
          <p className={styles.contagem}>{contagem}</p>
        </div>
        <button
          type="button"
          className={styles.adicionar}
          onClick={onAdicionar}
        >
          <IconeMais />
          {rotuloAdicionar}
        </button>
      </header>

      <div
        className={`${styles.card} ${carregando ? styles.carregando : ""}`}
        aria-busy={carregando}
      >
        <div className={styles.rolagem}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th className={styles.colCheck}>
                  <input
                    ref={marcarTodas}
                    type="checkbox"
                    aria-label={`Selecionar todas: ${titulo}`}
                    checked={todasMarcadas}
                    disabled={itens.length === 0}
                    onChange={() =>
                      setMarcadas(
                        todasMarcadas
                          ? new Set()
                          : new Set(itens.map((i) => i.id)),
                      )
                    }
                  />
                </th>
                {colunas.map((c) => (
                  <th key={c.titulo} style={{ width: c.largura }}>
                    {c.titulo}
                  </th>
                ))}
                <th className={styles.colAcoes}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {itens.length === 0 && (
                <tr>
                  <td colSpan={colunas.length + 2} className={styles.vazio}>
                    {carregando ? "Carregando…" : vazio}
                  </td>
                </tr>
              )}

              {itens.map((item) => (
                <tr
                  key={item.id}
                  className={marcadas.has(item.id) ? styles.marcada : ""}
                >
                  <td className={styles.colCheck}>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${item.nome}`}
                      checked={marcadas.has(item.id)}
                      onChange={() => alternar(item.id)}
                    />
                  </td>
                  {colunas.map((c) => (
                    <td key={c.titulo}>{c.render(item)}</td>
                  ))}
                  <td className={styles.colAcoes}>
                    <div className={styles.acoes}>
                      <button
                        type="button"
                        aria-label={`Editar ${item.nome}`}
                        onClick={() => onEditar(item)}
                      >
                        <IconeLapis />
                      </button>
                      <button
                        type="button"
                        aria-label={`Apagar ${item.nome}`}
                        onClick={() => apagar([item])}
                      >
                        <IconeLixeira />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className={styles.rodape}>
          <span className={styles.dica}>
            Marque as linhas para apagar várias de uma vez
          </span>
          <button
            type="button"
            className={styles.apagar}
            disabled={selecionados.length === 0}
            onClick={() => apagar(selecionados)}
          >
            <IconeLixeira />
            Apagar selecionadas
            {selecionados.length > 0 && ` (${selecionados.length})`}
          </button>
        </footer>
      </div>
    </section>
  );
}
