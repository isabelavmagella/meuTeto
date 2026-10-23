import { useEffect, useRef } from "react";
import styles from "./TabelaTransacoes.module.css";
import type { Transacao } from "../../pages/Transactions/api";
import { moeda } from "../../pages/Dashboard/formatadores";
import { IconeLapis, IconeLixeira } from "./Icones";
import { Paginacao } from "./Paginacao";

type Props = {
  transacoes: Transacao[];
  total: number;
  inicio: number;
  pagina: number;
  totalPaginas: number;
  onTrocarPagina: (pagina: number) => void;
  selecionadas: Set<number>;
  onAlternar: (id: number) => void;
  onAlternarTodas: () => void;
  onEditar?: (transacao: Transacao) => void;
  onApagar: (transacao: Transacao) => void;
  carregando: boolean;
};

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export function TabelaTransacoes({
  transacoes,
  total,
  inicio,
  pagina,
  totalPaginas,
  onTrocarPagina,
  selecionadas,
  onAlternar,
  onAlternarTodas,
  onEditar,
  onApagar,
  carregando,
}: Props) {
  const marcarTodas = useRef<HTMLInputElement>(null);
  const qtdMarcadas = transacoes.filter((t) => selecionadas.has(t.id)).length;
  const todasMarcadas =
    transacoes.length > 0 && qtdMarcadas === transacoes.length;

  useEffect(() => {
    if (marcarTodas.current) {
      marcarTodas.current.indeterminate = qtdMarcadas > 0 && !todasMarcadas;
    }
  }, [qtdMarcadas, todasMarcadas]);

  return (
    <section
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
                  aria-label="Selecionar todas desta página"
                  checked={todasMarcadas}
                  disabled={transacoes.length === 0}
                  onChange={onAlternarTodas}
                />
              </th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th className={styles.direita}>Valor</th>
              <th>Data da compra</th>
              <th className={styles.centro}>Parcela</th>
              <th>Categoria</th>
              <th>Vencimento</th>
              <th className={styles.direita}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {transacoes.length === 0 && (
              <tr>
                <td colSpan={9} className={styles.vazio}>
                  {carregando
                    ? "Carregando transações…"
                    : "Nenhuma transação encontrada."}
                </td>
              </tr>
            )}

            {transacoes.map((t) => {
              const receita = t.tipo === "RECEITA";
              return (
                <tr
                  key={t.id}
                  className={selecionadas.has(t.id) ? styles.marcada : ""}
                >
                  <td className={styles.colCheck}>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${t.descricao}`}
                      checked={selecionadas.has(t.id)}
                      onChange={() => onAlternar(t.id)}
                    />
                  </td>
                  <td>
                    <span
                      className={`${styles.tipo} ${receita ? styles.tipoReceita : styles.tipoDespesa}`}
                    >
                      <span aria-hidden="true">{receita ? "▲" : "▼"}</span>
                      {receita ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td className={styles.descricao}>{t.descricao}</td>
                  <td
                    className={`${styles.direita} ${styles.valor} ${receita ? styles.valorReceita : ""}`}
                  >
                    {receita ? "+" : "−"}
                    {moeda.format(Number(t.valor))}
                  </td>
                  <td className={styles.muted}>{formatarData(t.data)}</td>
                  <td className={`${styles.centro} ${styles.muted}`}>
                    {t.totalParcelas && t.totalParcelas > 1
                      ? `${t.parcelaAtual}/${t.totalParcelas}`
                      : "—"}
                  </td>
                  <td className={styles.muted}>
                    {t.category ? (
                      <span className={styles.categoria}>
                        <span
                          className={styles.ponto}
                          style={{ background: t.category.cor }}
                        />
                        {t.category.nome}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={styles.muted}>
                    {formatarData(t.dataVencimento)}
                  </td>
                  <td className={styles.direita}>
                    <div className={styles.acoes}>
                      <button
                        type="button"
                        aria-label={`Editar ${t.descricao}`}
                        onClick={() => onEditar?.(t)}
                      >
                        <IconeLapis />
                      </button>
                      <button
                        type="button"
                        aria-label={`Apagar ${t.descricao}`}
                        onClick={() => onApagar(t)}
                      >
                        <IconeLixeira />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className={styles.rodape}>
        <span>
          {total === 0
            ? "Nenhuma transação"
            : `Mostrando ${inicio + 1}–${inicio + transacoes.length} de ${total} ${total === 1 ? "transação" : "transações"}`}
        </span>
        <Paginacao
          pagina={pagina}
          totalPaginas={totalPaginas}
          onTrocar={onTrocarPagina}
        />
      </footer>
    </section>
  );
}
