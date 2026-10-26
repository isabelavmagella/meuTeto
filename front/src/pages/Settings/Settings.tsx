import { useEffect, useState } from "react";
import styles from "./Settings.module.css";
import { Header } from "../../components/Header/Header";
import {
  SecaoCadastro,
  type Coluna,
} from "../../components/Settings/SecaoCadastro";
import { ModalCategoria } from "../../components/Settings/ModalCategoria";
import { ModalFormaPagamento } from "../../components/Settings/ModalFormaPagamento";
import { nomeDaCor } from "../../components/Settings/paleta";
import {
  apagarCategorias,
  apagarFormasPagamento,
  buscar,
  type Categoria,
  type FormaPagamento,
} from "./api";

function contar(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

const COLUNAS_CATEGORIA: Coluna<Categoria>[] = [
  { titulo: "Categoria", render: (c) => c.nome, largura: "60%" },
  {
    titulo: "Cor",
    render: (c) => (
      <span
        className={styles.cor}
        style={{ background: c.cor }}
        role="img"
        aria-label={nomeDaCor(c.cor)}
        title={nomeDaCor(c.cor)}
      />
    ),
  },
];

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
    buscar<Categoria>("/categories", controle.signal)
      .then((lista) => {
        setCategorias(lista);
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
        <SecaoCadastro
          titulo="Categorias"
          contagem={contar(categorias.length, "cadastrada", "cadastradas")}
          rotuloAdicionar="Adicionar categoria"
          vazio="Nenhuma categoria cadastrada."
          itens={categorias}
          colunas={COLUNAS_CATEGORIA}
          carregando={categoriasCarregadas !== versaoCategorias}
          onAdicionar={() => setCategoriaEmEdicao("nova")}
          onEditar={setCategoriaEmEdicao}
          onApagar={(lista) =>
            apagar(
              lista,
              { singular: "a categoria", plural: "categorias" },
              "As transações já lançadas continuam com a categoria.",
              apagarCategorias,
              () => setVersaoCategorias((v) => v + 1),
            )
          }
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
