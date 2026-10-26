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
import {
  apagarCategorias,
  apagarFormasPagamento,
  apagarSubcategorias,
  buscar,
  type Categoria,
  type FormaPagamento,
  type Subcategoria,
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

export function Settings() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
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
          Gerencie as categorias e as formas de pagamento usadas nas transações.
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
