import { useEffect, useState } from "react";
import styles from "./Settings.module.css";
import { Header } from "../../components/Header/Header";
import {
  SecaoCadastro,
  type Coluna,
} from "../../components/Settings/SecaoCadastro";
import { TabelaCategorias } from "../../components/Settings/TabelaCategorias";
import { ModalCategoria } from "../../components/Settings/ModalCategoria";
import { ModalFormaPagamento } from "../../components/Settings/ModalFormaPagamento";
import { ModalOrcamento } from "../../components/Settings/ModalOrcamento";
import { ModalRecorrencia } from "../../components/Settings/ModalRecorrencia";
import { capitalizar, moeda, nomeDoMes } from "../Dashboard/formatadores";
import {
  apagarCategorias,
  apagarFormasPagamento,
  apagarOrcamentos,
  apagarRecorrencias,
  apagarSubcategorias,
  buscar,
  type Categoria,
  type FormaPagamento,
  type Orcamento,
  type Subcategoria,
  type TransacaoRecorrente,
} from "./api";

function contar(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

const COLUNAS_FORMA: Coluna<FormaPagamento>[] = [
  { titulo: "Forma de pagamento", render: (f) => f.nome, largura: "40%" },
  {
    titulo: "Dia do fechamento",
    render: (f) => (f.diaFechamento ? `Dia ${f.diaFechamento}` : "—"),
  },
  {
    titulo: "Dia do vencimento",
    render: (f) => (f.diaValidade ? `Dia ${f.diaValidade}` : "—"),
  },
];

type LinhaOrcamento = Orcamento & { nome: string };

function nomeDoMesAno(mes: string) {
  const [ano, numero] = mes.slice(0, 7).split("-").map(Number);
  return `${capitalizar(nomeDoMes(ano, numero))} ${ano}`;
}

const COLUNAS_ORCAMENTO: Coluna<LinhaOrcamento>[] = [
  {
    titulo: "Categoria",
    render: (o) => (
      <span className={styles.categoria}>
        <span
          className={styles.ponto}
          style={{ background: o.category.cor }}
          aria-hidden="true"
        />
        {o.category.nome}
      </span>
    ),
    largura: "40%",
  },
  { titulo: "Mês", render: (o) => nomeDoMesAno(o.mes) },
  {
    titulo: "Valor limite",
    render: (o) => (
      <strong className={styles.valor}>
        {moeda.format(Number(o.valorLimite))}
      </strong>
    ),
  },
];

type LinhaRecorrencia = TransacaoRecorrente & { nome: string };

const COLUNAS_RECORRENCIA: Coluna<LinhaRecorrencia>[] = [
  {
    titulo: "Descrição",
    render: (r) => (
      <span className={styles.categoria}>
        <span
          className={styles.ponto}
          style={{ background: r.category?.cor ?? "var(--border-strong)" }}
          aria-hidden="true"
        />
        {r.descricao}
      </span>
    ),
    largura: "40%",
  },
  {
    titulo: "Categoria",
    render: (r) =>
      r.category
        ? r.subcategory
          ? `${r.category.nome} › ${r.subcategory.nome}`
          : r.category.nome
        : "—",
  },
  { titulo: "Todo dia", render: (r) => `Dia ${r.diaDoMes}` },
  {
    titulo: "Valor",
    render: (r) => (
      <strong
        className={`${styles.valor} ${r.tipo === "RECEITA" ? styles.receita : ""}`}
      >
        {r.tipo === "RECEITA" ? "+ " : ""}
        {moeda.format(Number(r.valor))}
      </strong>
    ),
  },
];

export function Settings() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [orcamentos, setOrcamentos] = useState<LinhaOrcamento[]>([]);
  const [versaoOrcamentos, setVersaoOrcamentos] = useState(0);
  const [orcamentosCarregados, setOrcamentosCarregados] = useState(-1);
  const [orcamentoEmEdicao, setOrcamentoEmEdicao] = useState<
    Orcamento | "novo" | null
  >(null);
  const [recorrencias, setRecorrencias] = useState<LinhaRecorrencia[]>([]);
  const [versaoRecorrencias, setVersaoRecorrencias] = useState(0);
  const [recorrenciasCarregadas, setRecorrenciasCarregadas] = useState(-1);
  const [recorrenciaEmEdicao, setRecorrenciaEmEdicao] = useState<
    TransacaoRecorrente | "nova" | null
  >(null);
  const [versaoCategorias, setVersaoCategorias] = useState(0);
  const [versaoFormas, setVersaoFormas] = useState(0);
  const [categoriasCarregadas, setCategoriasCarregadas] = useState(-1);
  const [formasCarregadas, setFormasCarregadas] = useState(-1);
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<
    Categoria | "nova" | null
  >(null);
  const [formaEmEdicao, setFormaEmEdicao] = useState<
    FormaPagamento | "nova" | null
  >(null);

  useEffect(() => {
    const controle = new AbortController();
    Promise.all([
      buscar<Categoria>("/categories", controle.signal),
      buscar<Subcategoria>("/subcategories", controle.signal),
    ])
      .then(([cats, subs]) => {
        setCategorias(cats);
        setSubcategorias(subs);
        setCategoriasCarregadas(versaoCategorias);
      })
      .catch(() => {});
    return () => controle.abort();
  }, [versaoCategorias]);

  useEffect(() => {
    const controle = new AbortController();
    buscar<FormaPagamento>("/payments", controle.signal)
      .then((lista) => {
        setFormas(lista);
        setFormasCarregadas(versaoFormas);
      })
      .catch(() => {});
    return () => controle.abort();
  }, [versaoFormas]);

  // Recarrega também quando as categorias mudam, pra refletir nome e cor.
  useEffect(() => {
    const controle = new AbortController();
    buscar<Orcamento>("/budgets", controle.signal)
      .then((lista) => {
        setOrcamentos(
          lista.map((o) => ({
            ...o,
            nome: `${o.category.nome} (${nomeDoMesAno(o.mes)})`,
          })),
        );
        setOrcamentosCarregados(versaoOrcamentos);
      })
      .catch(() => {});
    return () => controle.abort();
  }, [versaoOrcamentos, versaoCategorias]);

  // Recarrega também quando categorias ou formas mudam, pra refletir nome e cor.
  useEffect(() => {
    const controle = new AbortController();
    buscar<TransacaoRecorrente>("/recurring-transactions", controle.signal)
      .then((lista) => {
        setRecorrencias(lista.map((r) => ({ ...r, nome: r.descricao })));
        setRecorrenciasCarregadas(versaoRecorrencias);
      })
      .catch(() => {});
    return () => controle.abort();
  }, [versaoRecorrencias, versaoCategorias, versaoFormas]);

  async function apagar<T extends { id: number; nome: string }>(
    lista: T[],
    tipo: { singular: string; plural: string },
    aviso: string,
    apagarIds: (ids: number[]) => Promise<void>,
    recarregar: () => void,
  ) {
    const mensagem =
      lista.length === 1
        ? `Apagar ${tipo.singular} "${lista[0]?.nome}"?`
        : `Apagar ${lista.length} ${tipo.plural}?`;
    if (!window.confirm(`${mensagem}\n\n${aviso}`)) return false;

    try {
      await apagarIds(lista.map((i) => i.id));
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Não foi possível apagar.",
      );
      return false;
    }
    recarregar();
    return true;
  }

  async function apagarDaArvore(cats: Categoria[], subs: Subcategoria[]) {
    const partes = [
      cats.length > 0 && contar(cats.length, "categoria", "categorias"),
      subs.length > 0 && contar(subs.length, "subcategoria", "subcategorias"),
    ].filter(Boolean);
    const unica =
      cats.length + subs.length === 1
        ? cats[0]
          ? `a categoria "${cats[0].nome}"`
          : `a subcategoria "${subs[0]?.nome}"`
        : null;
    const avisos = [
      cats.length > 0 &&
        "As subcategorias das categorias apagadas também serão apagadas.",
      "As transações já lançadas continuam com a categoria e a subcategoria.",
    ].filter(Boolean);
    if (
      !window.confirm(
        `Apagar ${unica ?? partes.join(" e ")}?\n\n${avisos.join(" ")}`,
      )
    )
      return false;

    try {
      if (subs.length > 0) await apagarSubcategorias(subs.map((s) => s.id));
      if (cats.length > 0) await apagarCategorias(cats.map((c) => c.id));
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Não foi possível apagar.",
      );
      return false;
    } finally {
      setVersaoCategorias((v) => v + 1);
    }
    return true;
  }

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.intro}>
        <h1>Configurações</h1>
        <p>
          Gerencie as categorias, as formas de pagamento, os orçamentos mensais
          e as transações recorrentes.
        </p>
      </div>

      <div className={styles.grade}>
        <TabelaCategorias
          categorias={categorias}
          subcategorias={subcategorias}
          carregando={categoriasCarregadas !== versaoCategorias}
          onAdicionar={() => setCategoriaEmEdicao("nova")}
          onEditar={setCategoriaEmEdicao}
          onApagar={apagarDaArvore}
          onSubcategoriaSalva={() => setVersaoCategorias((v) => v + 1)}
        />

        <SecaoCadastro
          titulo="Formas de pagamento"
          contagem={contar(formas.length, "cadastrada", "cadastradas")}
          rotuloAdicionar="Adicionar forma de pagamento"
          vazio="Nenhuma forma de pagamento cadastrada."
          itens={formas}
          colunas={COLUNAS_FORMA}
          carregando={formasCarregadas !== versaoFormas}
          onAdicionar={() => setFormaEmEdicao("nova")}
          onEditar={setFormaEmEdicao}
          onApagar={(lista) =>
            apagar(
              lista,
              {
                singular: "a forma de pagamento",
                plural: "formas de pagamento",
              },
              "As transações já lançadas continuam com a forma de pagamento.",
              apagarFormasPagamento,
              () => setVersaoFormas((v) => v + 1),
            )
          }
        />

        <SecaoCadastro
          titulo="Orçamentos"
          contagem={contar(orcamentos.length, "cadastrado", "cadastrados")}
          rotuloAdicionar="Adicionar orçamento"
          vazio="Nenhum orçamento cadastrado."
          itens={orcamentos}
          colunas={COLUNAS_ORCAMENTO}
          carregando={orcamentosCarregados !== versaoOrcamentos}
          onAdicionar={() => setOrcamentoEmEdicao("novo")}
          onEditar={setOrcamentoEmEdicao}
          onApagar={(lista) =>
            apagar(
              lista,
              { singular: "o orçamento", plural: "orçamentos" },
              "Os gastos da categoria não são apagados.",
              apagarOrcamentos,
              () => setVersaoOrcamentos((v) => v + 1),
            )
          }
        />

        <SecaoCadastro
          titulo="Transações recorrentes"
          contagem={contar(recorrencias.length, "cadastrada", "cadastradas")}
          rotuloAdicionar="Adicionar recorrência"
          vazio="Nenhuma transação recorrente cadastrada."
          itens={recorrencias}
          colunas={COLUNAS_RECORRENCIA}
          carregando={recorrenciasCarregadas !== versaoRecorrencias}
          onAdicionar={() => setRecorrenciaEmEdicao("nova")}
          onEditar={setRecorrenciaEmEdicao}
          onApagar={(lista) =>
            apagar(
              lista,
              {
                singular: "a transação recorrente",
                plural: "transações recorrentes",
              },
              "Ela para de lançar nos próximos meses. As transações já lançadas continuam.",
              apagarRecorrencias,
              () => setVersaoRecorrencias((v) => v + 1),
            )
          }
        />
      </div>

      {categoriaEmEdicao && (
        <ModalCategoria
          categoria={
            categoriaEmEdicao === "nova" ? undefined : categoriaEmEdicao
          }
          coresEmUso={categorias.map((c) => c.cor)}
          onFechar={() => setCategoriaEmEdicao(null)}
          onSalvar={() => {
            setCategoriaEmEdicao(null);
            setVersaoCategorias((v) => v + 1);
          }}
        />
      )}

      {orcamentoEmEdicao && (
        <ModalOrcamento
          orcamento={
            orcamentoEmEdicao === "novo" ? undefined : orcamentoEmEdicao
          }
          categorias={categorias}
          onFechar={() => setOrcamentoEmEdicao(null)}
          onSalvar={() => {
            setOrcamentoEmEdicao(null);
            setVersaoOrcamentos((v) => v + 1);
          }}
        />
      )}

      {recorrenciaEmEdicao && (
        <ModalRecorrencia
          recorrencia={
            recorrenciaEmEdicao === "nova" ? undefined : recorrenciaEmEdicao
          }
          categorias={categorias}
          subcategorias={subcategorias}
          pagamentos={formas}
          onFechar={() => setRecorrenciaEmEdicao(null)}
          onSalvar={() => {
            setRecorrenciaEmEdicao(null);
            setVersaoRecorrencias((v) => v + 1);
          }}
        />
      )}

      {formaEmEdicao && (
        <ModalFormaPagamento
          forma={formaEmEdicao === "nova" ? undefined : formaEmEdicao}
          onFechar={() => setFormaEmEdicao(null)}
          onSalvar={() => {
            setFormaEmEdicao(null);
            setVersaoFormas((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
