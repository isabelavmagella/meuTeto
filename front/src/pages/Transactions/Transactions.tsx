import { useEffect, useState } from "react";
import styles from "./Transactions.module.css";
import { PERIODOS } from "../Dashboard/constants";
import {
  apagarTransacao,
  buscar,
  type Categoria,
  type FormaPagamento,
  type Transacao,
} from "./api";
import { FiltroSelect } from "../../components/Header/FiltroSelect";
import { Header } from "../../components/Header/Header";
import { BarraMobile } from "../../components/Header/BarraMobile";
import {
  SheetFiltros,
  type Filtros,
} from "../../components/Transactions/SheetFiltros";
import { ResumoTransacoes } from "../../components/Transactions/ResumoTransacoes";
import { TabelaTransacoes } from "../../components/Transactions/TabelaTransacoes";
import { ModalTransacao } from "../../components/Transactions/ModalTransacao";
import {
  IconeCalendario,
  IconeCartao,
  IconeEtiqueta,
} from "../../components/Header/Icones";

const POR_PAGINA = 12;

export function Transactions() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pagamentos, setPagamentos] = useState<FormaPagamento[]>([]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Transacao | "nova" | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [consultaCarregada, setConsultaCarregada] = useState("");
  const [versao, setVersao] = useState(0);
  const [categoria, setCategoria] = useState("");
  const [pagamento, setPagamento] = useState("");
  const [periodo, setPeriodo] = useState(
    PERIODOS[PERIODOS.length - 1]?.valor ?? "",
  );
  const [pagina, setPagina] = useState(1);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());

  useEffect(() => {
    const controle = new AbortController();
    buscar<Categoria>("/categories", controle.signal)
      .then(setCategorias)
      .catch(() => {});
    buscar<FormaPagamento>("/payments", controle.signal)
      .then(setPagamentos)
      .catch(() => {});
    return () => controle.abort();
  }, []);

  const consulta = `${periodo}|${categoria}|${versao}`;
  const carregando = consultaCarregada !== consulta;

  useEffect(() => {
    const controle = new AbortController();
    const params = new URLSearchParams({ por: "vencimento" });
    if (periodo) params.set("mes", periodo);
    if (categoria) params.set("categoria", categoria);
    buscar<Transacao>(`/transactions?${params}`, controle.signal)
      .then((lista) => {
        setTransacoes(lista);
        setSelecionadas(new Set());
        setConsultaCarregada(`${periodo}|${categoria}|${versao}`);
      })
      .catch(() => {});
    return () => controle.abort();
  }, [periodo, categoria, versao]);

  const transacoesFiltradas = pagamento
    ? transacoes.filter((t) => String(t.formaPagamentoId) === pagamento)
    : transacoes;
  const somar = (tipo: Transacao["tipo"]) =>
    transacoesFiltradas
      .filter((t) => t.tipo === tipo)
      .reduce((acc, t) => acc + Number(t.valor), 0);

  const totalPaginas = Math.max(
    1,
    Math.ceil(transacoesFiltradas.length / POR_PAGINA),
  );
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const transacoesDaPagina = transacoesFiltradas.slice(
    inicio,
    inicio + POR_PAGINA,
  );

  const opcoesCategoria = [
    { valor: "", rotulo: "Todas" },
    ...categorias.map((c) => ({ valor: String(c.id), rotulo: c.nome })),
  ];
  const opcoesPeriodo = [{ valor: "", rotulo: "Todos" }, ...PERIODOS];
  const opcoesPagamento = [
    { valor: "", rotulo: "Todas" },
    ...pagamentos.map((p) => ({ valor: String(p.id), rotulo: p.nome })),
  ];

  function trocarFiltro(setter: (valor: string) => void) {
    return (valor: string) => {
      setter(valor);
      setPagina(1);
      setSelecionadas(new Set());
    };
  }

  function aplicarFiltros(filtros: Filtros) {
    setCategoria(filtros.categoria);
    setPagamento(filtros.pagamento);
    setPeriodo(filtros.periodo);
    setPagina(1);
    setSelecionadas(new Set());
    setFiltrosAbertos(false);
  }

  function alternar(id: number) {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  function alternarTodas() {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      const todas = transacoesDaPagina.every((t) => nova.has(t.id));
      for (const t of transacoesDaPagina) {
        if (todas) nova.delete(t.id);
        else nova.add(t.id);
      }
      return nova;
    });
  }

  async function apagar(lista: Transacao[]) {
    const parceladas = lista.some((t) => t.parcelamentoId);
    const mensagem =
      lista.length === 1
        ? `Apagar "${lista[0]?.descricao}"?`
        : `Apagar ${lista.length} transações?`;
    const aviso = parceladas
      ? "\n\nTransações parceladas são apagadas com todas as parcelas."
      : "";
    if (!window.confirm(mensagem + aviso)) return;

    try {
      for (const t of lista) await apagarTransacao(t.id);
    } catch {
      window.alert("Não foi possível apagar. Tente de novo.");
    }
    setVersao((v) => v + 1);
  }

  return (
    <div className={styles.page}>
      <Header>
        <FiltroSelect
          icone={<IconeEtiqueta />}
          rotulo="Categoria"
          valor={categoria}
          opcoes={opcoesCategoria}
          onChange={trocarFiltro(setCategoria)}
        />
        <FiltroSelect
          icone={<IconeCartao />}
          rotulo="Pagamento"
          valor={pagamento}
          opcoes={opcoesPagamento}
          onChange={trocarFiltro(setPagamento)}
        />
        <FiltroSelect
          icone={<IconeCalendario />}
          rotulo="Mês"
          valor={periodo}
          opcoes={opcoesPeriodo}
          onChange={trocarFiltro(setPeriodo)}
        />
      </Header>

      <BarraMobile
        periodo={periodo}
        opcoesPeriodo={opcoesPeriodo}
        onTrocarPeriodo={trocarFiltro(setPeriodo)}
        filtrosAtivos={(categoria ? 1 : 0) + (pagamento ? 1 : 0)}
        onAbrirFiltros={() => setFiltrosAbertos(true)}
      />

      <ResumoTransacoes
        quantidade={transacoesFiltradas.length}
        receitas={somar("RECEITA")}
        despesas={somar("DESPESA")}
        selecionadas={selecionadas.size}
        onAdicionar={() => setEmEdicao("nova")}
        onApagarSelecionadas={() =>
          apagar(transacoesFiltradas.filter((t) => selecionadas.has(t.id)))
        }
      />

      <TabelaTransacoes
        transacoes={transacoesDaPagina}
        total={transacoesFiltradas.length}
        inicio={inicio}
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        onTrocarPagina={setPagina}
        selecionadas={selecionadas}
        onAlternar={alternar}
        onAlternarTodas={alternarTodas}
        onEditar={setEmEdicao}
        onApagar={(t) => apagar([t])}
        carregando={carregando}
      />

      {filtrosAbertos && (
        <SheetFiltros
          filtros={{ categoria, pagamento, periodo }}
          opcoesCategoria={opcoesCategoria}
          opcoesPagamento={opcoesPagamento}
          opcoesPeriodo={opcoesPeriodo}
          onAplicar={aplicarFiltros}
          onFechar={() => setFiltrosAbertos(false)}
        />
      )}

      {emEdicao && (
        <ModalTransacao
          transacao={emEdicao === "nova" ? undefined : emEdicao}
          categorias={categorias}
          pagamentos={pagamentos}
          onFechar={() => setEmEdicao(null)}
          onSalvar={() => {
            setEmEdicao(null);
            setVersao((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
