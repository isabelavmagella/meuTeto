import { Fragment, useEffect, useId, useRef, useState } from "react";
import base from "./SecaoCadastro.module.css";
import styles from "./TabelaCategorias.module.css";
import {
  IconeChevron,
  IconeLapis,
  IconeLixeira,
  IconeMais,
} from "../Transactions/Icones";
import {
  salvarSubcategoria,
  type Categoria,
  type Subcategoria,
} from "../../pages/Settings/api";

type Props = {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  carregando: boolean;
  onAdicionar: () => void;
  onEditar: (categoria: Categoria) => void;
  onApagar: (
    categorias: Categoria[],
    subcategorias: Subcategoria[],
  ) => Promise<boolean>;
  onSubcategoriaSalva: () => void;
};

type Edicao = { categoryId: number; id?: number };

function contar(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function alternarEm(conjunto: Set<number>, id: number) {
  const novo = new Set(conjunto);
  if (novo.has(id)) novo.delete(id);
  else novo.add(id);
  return novo;
}

export function TabelaCategorias({
  categorias,
  subcategorias,
  carregando,
  onAdicionar,
  onEditar,
  onApagar,
  onSubcategoriaSalva,
}: Props) {
  const tituloId = useId();
  const marcarTodas = useRef<HTMLInputElement>(null);
  const [abertas, setAbertas] = useState<Set<number>>(new Set());
  const [catMarcadas, setCatMarcadas] = useState<Set<number>>(new Set());
  const [subMarcadas, setSubMarcadas] = useState<Set<number>>(new Set());
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const catSelecionadas = categorias.filter((c) => catMarcadas.has(c.id));
  // Apagar a categoria já leva as subcategorias dela junto.
  const subSelecionadas = subcategorias.filter(
    (s) => subMarcadas.has(s.id) && !catMarcadas.has(s.categoryId),
  );
  const totalSelecionado = catSelecionadas.length + subSelecionadas.length;
  const todasMarcadas =
    categorias.length > 0 && catSelecionadas.length === categorias.length;

  useEffect(() => {
    if (marcarTodas.current) {
      marcarTodas.current.indeterminate =
        totalSelecionado > 0 && !todasMarcadas;
    }
  }, [totalSelecionado, todasMarcadas]);

  function subcategoriasDe(categoryId: number) {
    return subcategorias.filter((s) => s.categoryId === categoryId);
  }

  function abrirEdicao(nova: Edicao, nomeInicial = "") {
    setEdicao(nova);
    setNome(nomeInicial);
    setErro("");
  }

  function fecharEdicao() {
    setEdicao(null);
    setErro("");
  }

  async function salvar() {
    if (!edicao || salvando) return;
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("Informe o nome da subcategoria.");
      return;
    }

    setSalvando(true);
    try {
      await salvarSubcategoria(
        { nome: nomeLimpo, categoryId: edicao.categoryId },
        edicao.id,
      );
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a subcategoria.",
      );
      return;
    } finally {
      setSalvando(false);
    }
    fecharEdicao();
    onSubcategoriaSalva();
  }

  async function apagar(cats: Categoria[], subs: Subcategoria[]) {
    if (await onApagar(cats, subs)) {
      setCatMarcadas(new Set());
      setSubMarcadas(new Set());
    }
  }

  function linhaFormulario(chave: string) {
    return (
      <tr key={chave} className={styles.formulario}>
        <td className={styles.ramo} />
        <td colSpan={2}>
          <input
            className={styles.campo}
            aria-label="Nome da subcategoria"
            placeholder="Nome da subcategoria"
            value={nome}
            maxLength={60}
            autoFocus
            aria-invalid={erro !== ""}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void salvar();
              } else if (e.key === "Escape") {
                fecharEdicao();
              }
            }}
          />
          {erro && (
            <span className={styles.erro} role="alert">
              {erro}
            </span>
          )}
        </td>
        <td className={base.colAcoes}>
          <div className={styles.botoesForm}>
            <button
              type="button"
              className={styles.cancelar}
              onClick={fecharEdicao}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.salvar}
              disabled={salvando}
              onClick={() => void salvar()}
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <section className={base.secao} aria-labelledby={tituloId}>
      <header className={base.cabecalho}>
        <div>
          <h2 id={tituloId} className={base.titulo}>
            Categorias
          </h2>
          <p className={base.contagem}>
            {contar(categorias.length, "cadastrada", "cadastradas")}
          </p>
        </div>
        <button type="button" className={base.adicionar} onClick={onAdicionar}>
          <IconeMais />
          Adicionar categoria
        </button>
      </header>

      <div
        className={`${base.card} ${carregando ? base.carregando : ""}`}
        aria-busy={carregando}
      >
        <div className={base.rolagem}>
          <table className={`${base.tabela} ${styles.arvore}`}>
            <thead>
              <tr>
                <th className={base.colCheck}>
                  <input
                    ref={marcarTodas}
                    type="checkbox"
                    aria-label="Selecionar todas as categorias"
                    checked={todasMarcadas}
                    disabled={categorias.length === 0}
                    onChange={() => {
                      setSubMarcadas(new Set());
                      setCatMarcadas(
                        todasMarcadas
                          ? new Set()
                          : new Set(categorias.map((c) => c.id)),
                      );
                    }}
                  />
                </th>
                <th style={{ width: "60%" }}>Categoria</th>
                <th>Cor</th>
                <th className={base.colAcoes}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {categorias.length === 0 && (
                <tr>
                  <td colSpan={4} className={base.vazio}>
                    {carregando
                      ? "Carregando…"
                      : "Nenhuma categoria cadastrada."}
                  </td>
                </tr>
              )}

              {categorias.map((categoria) => {
                const subs = subcategoriasDe(categoria.id);
                const aberta = abertas.has(categoria.id);
                const marcada = catMarcadas.has(categoria.id);
                const ponto = (
                  <span
                    className={styles.ponto}
                    style={{ background: categoria.cor }}
                    aria-hidden="true"
                  />
                );

                return (
                  <Fragment key={categoria.id}>
                    <tr
                      className={`${styles.categoria} ${marcada ? styles.selecionada : ""}`}
                    >
                      <td className={base.colCheck}>
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${categoria.nome}`}
                          checked={marcada}
                          onChange={() =>
                            setCatMarcadas((atual) =>
                              alternarEm(atual, categoria.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <div className={styles.nome}>
                          <button
                            type="button"
                            className={`${styles.expandir} ${aberta ? styles.aberta : ""}`}
                            aria-expanded={aberta}
                            aria-label={`${aberta ? "Esconder" : "Mostrar"} subcategorias de ${categoria.nome}`}
                            onClick={() =>
                              setAbertas((atual) =>
                                alternarEm(atual, categoria.id),
                              )
                            }
                          >
                            <IconeChevron direcao="direita" />
                          </button>
                          {categoria.nome}
                          <span className={styles.quantidade}>
                            {contar(
                              subs.length,
                              "subcategoria",
                              "subcategorias",
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.nome}>{ponto}</div>
                      </td>
                      <td className={base.colAcoes}>
                        <div className={base.acoes}>
                          <button
                            type="button"
                            aria-label={`Editar ${categoria.nome}`}
                            onClick={() => onEditar(categoria)}
                          >
                            <IconeLapis />
                          </button>
                          <button
                            type="button"
                            aria-label={`Apagar ${categoria.nome}`}
                            onClick={() => apagar([categoria], [])}
                          >
                            <IconeLixeira />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {aberta &&
                      subs.map((sub) =>
                        edicao?.id === sub.id ? (
                          linhaFormulario(`sub-${sub.id}`)
                        ) : (
                          <tr
                            key={`sub-${sub.id}`}
                            className={`${styles.sub} ${marcada || subMarcadas.has(sub.id) ? styles.selecionada : ""}`}
                          >
                            <td className={`${base.colCheck} ${styles.ramo}`}>
                              <input
                                type="checkbox"
                                aria-label={`Selecionar ${sub.nome}`}
                                checked={marcada || subMarcadas.has(sub.id)}
                                disabled={marcada}
                                onChange={() =>
                                  setSubMarcadas((atual) =>
                                    alternarEm(atual, sub.id),
                                  )
                                }
                              />
                            </td>
                            <td>
                              <div className={`${styles.nome} ${styles.recuo}`}>
                                {ponto}
                                {sub.nome}
                              </div>
                            </td>
                            <td className={styles.corSub}></td>
                            <td className={base.colAcoes}>
                              <div className={base.acoes}>
                                <button
                                  type="button"
                                  aria-label={`Editar ${sub.nome}`}
                                  onClick={() =>
                                    abrirEdicao(
                                      { categoryId: categoria.id, id: sub.id },
                                      sub.nome,
                                    )
                                  }
                                >
                                  <IconeLapis />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Apagar ${sub.nome}`}
                                  onClick={() => apagar([], [sub])}
                                >
                                  <IconeLixeira />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ),
                      )}

                    {aberta &&
                      (edicao?.categoryId === categoria.id && !edicao.id ? (
                        linhaFormulario(`nova-${categoria.id}`)
                      ) : (
                        <tr className={styles.sub}>
                          <td className={styles.ramo} />
                          <td colSpan={3}>
                            <button
                              type="button"
                              className={`${styles.adicionarSub} ${styles.recuo}`}
                              onClick={() =>
                                abrirEdicao({ categoryId: categoria.id })
                              }
                            >
                              <IconeMais />
                              Adicionar subcategoria
                            </button>
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className={base.rodape}>
          <span className={base.dica}>
            Marque as linhas para apagar várias de uma vez
          </span>
          <button
            type="button"
            className={base.apagar}
            disabled={totalSelecionado === 0}
            onClick={() => apagar(catSelecionadas, subSelecionadas)}
          >
            <IconeLixeira />
            Apagar selecionadas
            {totalSelecionado > 0 && ` (${totalSelecionado})`}
          </button>
        </footer>
      </div>
    </section>
  );
}
