import { useEffect, useState } from "react";
import styles from "./Transactions.module.css";
import { PERIODOS } from "../Dashboard/constants";
import {
  apagarTransacao,
  buscar,
  type Categoria,
  type FormaPagamento,
  type Subcategoria,
  type Transacao,
} from "./api";
import { FiltroSelect } from "../../components/Header/FiltroSelect";
import { BotaoFiltros } from "../../components/Header/BotaoFiltros";
import { Header } from "../../components/Header/Header";
import { BarraMobile } from "../../components/Header/BarraMobile";
import {
  SheetFiltros,
  type Filtros,
} from "../../components/Transactions/SheetFiltros";
import { ResumoTransacoes } from "../../components/Transactions/ResumoTransacoes";
import {
  ChipsFiltros,
  type Chip,
} from "../../components/Transactions/ChipsFiltros";
import { TabelaTransacoes } from "../../components/Transactions/TabelaTransacoes";
import { ModalTransacao } from "../../components/Transactions/ModalTransacao";
import { IconeCalendario } from "../../components/Header/Icones";

const POR_PAGINA = 12;
const ESPERA_BUSCA_MS = 300;
const DICA_VENCIMENTO = "Filtra pela data de vencimento da conta ou fatura";

// "AAAA-MM-DD" → "dd/mm" (curto, para o chip) ou "dd/mm/aaaa".
function formatarDia(iso: string, curto = false) {
  const [ano, mes, dia] = iso.split("-");
  return curto ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
}

export function Transactions() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [pagamentos, setPagamentos] = useState<FormaPagamento[]>([]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Transacao | "nova" | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [consultaCarregada, setConsultaCarregada] = useState("");
  const [versao, setVersao] = useState(0);
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [pagamento, setPagamento] = useState("");
  const [periodo, setPeriodo] = useState(
    PERIODOS[PERIODOS.length - 1]?.valor ?? "",
  );
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());

  useEffect(() => {
    const controle = new AbortController();
    buscar<Categoria>("/categories", controle.signal)
      .then(setCategorias)
      .catch(() => {});
    buscar<Subcategoria>("/subcategories", controle.signal)
      .then(setSubcategorias)
      .catch(() => {});
    buscar<FormaPagamento>("/payments", controle.signal)
      .then(setPagamentos)
      .catch(() => {});
    return () => controle.abort();
  }, []);

  // Espera parar de digitar antes de buscar na API.
  useEffect(() => {
    const texto = busca.trim();
    if (texto === buscaAplicada) return;
    const espera = setTimeout(() => {
      setBuscaAplicada(texto);
      setPagina(1);
      setSelecionadas(new Set());
    }, ESPERA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [busca, buscaAplicada]);

  // A data da compra é outro recorte de data: enquanto preenchida, substitui
  // o vencimento. A busca por texto soma com o vencimento.
  const temData = !!(de || ate);
  const periodoEfetivo = temData ? "" : periodo;

  const consulta = [
    periodoEfetivo,
    categoria,
    subcategoria,
    buscaAplicada,
    de,
    ate,
    versao,
  ].join("|");
  const carregando = consultaCarregada !== consulta;

  useEffect(() => {
    const controle = new AbortController();
    const params = new URLSearchParams({ por: "vencimento" });
    if (periodoEfetivo) params.set("mes", periodoEfetivo);
    if (categoria) params.set("categoria", categoria);
    if (subcategoria) params.set("subcategoria", subcategoria);
    if (buscaAplicada) params.set("busca", buscaAplicada);
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    buscar<Transacao>(`/transactions?${params}`, controle.signal)
      .then((lista) => {
        setTransacoes(lista);
        setSelecionadas(new Set());
        setConsultaCarregada(consulta);
      })
      .catch(() => {});
    return () => controle.abort();
  }, [
    periodoEfetivo,
    categoria,
    subcategoria,
    buscaAplicada,
    de,
    ate,
    versao,
    consulta,
  ]);

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
  const opcoesSubcategoria = subcategorias.map((s) => ({
    valor: String(s.id),
    rotulo: s.nome,
    categoria: String(s.categoryId),
  }));
  const opcoesPeriodo = [{ valor: "", rotulo: "Todos" }, ...PERIODOS];
  const opcoesPagamento = [
    { valor: "", rotulo: "Todas" },
    ...pagamentos.map((p) => ({ valor: String(p.id), rotulo: p.nome })),
  ];
  const filtrosAtivos =
    (categoria ? 1 : 0) +
    (subcategoria ? 1 : 0) +
    (pagamento ? 1 : 0) +
    (temData ? 1 : 0);
  const rotuloMes = PERIODOS.find((p) => p.valor === periodoEfetivo)?.rotulo;

  function recomecar() {
    setPagina(1);
    setSelecionadas(new Set());
  }

  // Escolher um vencimento volta a filtrar por ele, então tira a data da compra.
  function trocarMes(valor: string) {
    setPeriodo(valor);
    setDe("");
    setAte("");
    recomecar();
  }

  function aplicarFiltros(filtros: Filtros) {
    setCategoria(filtros.categoria);
    setSubcategoria(filtros.subcategoria);
    setPagamento(filtros.pagamento);
    setDe(filtros.de);
    setAte(filtros.ate);
    setPagina(1);
    setSelecionadas(new Set());
    setFiltrosAbertos(false);
  }

  const nomeDe = (opcoes: { valor: string; rotulo: string }[], valor: string) =>
    opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;

  const chips: Chip[] = [];
  if (temData) {
    chips.push({
      chave: "compra",
      rotulo: "Compra",
      valor:
        de && ate
          ? `${formatarDia(de, true)} – ${formatarDia(ate, true)}`
          : de
            ? `a partir de ${formatarDia(de, true)}`
            : `até ${formatarDia(ate, true)}`,
      titulo:
        de && ate
          ? `De ${formatarDia(de)} a ${formatarDia(ate)}`
          : de
            ? `A partir de ${formatarDia(de)}`
            : `Até ${formatarDia(ate)}`,
      onRemover: () => {
        setDe("");
        setAte("");
        recomecar();
      },
    });
  }
  if (rotuloMes) {
    chips.push({
      chave: "vencimento",
      rotulo: "Vencimento",
      valor: rotuloMes,
      onRemover: () => trocarMes(""),
    });
  }
  if (categoria) {
    chips.push({
      chave: "categoria",
      rotulo: "Categoria",
      valor: nomeDe(opcoesCategoria, categoria),
      // A subcategoria depende da categoria, então sai junto.
      onRemover: () => {
        setCategoria("");
        setSubcategoria("");
        recomecar();
      },
    });
  }
  if (subcategoria) {
    chips.push({
      chave: "subcategoria",
      rotulo: "Subcategoria",
      valor: nomeDe(opcoesSubcategoria, subcategoria),
      onRemover: () => {
        setSubcategoria("");
        recomecar();
      },
    });
  }
  if (pagamento) {
    chips.push({
      chave: "pagamento",
      rotulo: "Pagamento",
      valor: nomeDe(opcoesPagamento, pagamento),
      onRemover: () => {
        setPagamento("");
        recomecar();
      },
    });
  }
  if (buscaAplicada) {
    chips.push({
      chave: "busca",
      rotulo: "Busca",
      valor: `“${buscaAplicada}”`,
      onRemover: () => {
        setBusca("");
        setBuscaAplicada("");
        recomecar();
      },
    });
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
        <BotaoFiltros
          ativos={filtrosAtivos}
          onClick={() => setFiltrosAbertos(true)}
        />
        <FiltroSelect
          icone={<IconeCalendario />}
          rotulo="Vencimento"
          dica={DICA_VENCIMENTO}
          valor={periodoEfetivo}
          opcoes={opcoesPeriodo}
          onChange={trocarMes}
        />
      </Header>

      <BarraMobile
        periodo={periodoEfetivo}
        opcoesPeriodo={opcoesPeriodo}
        onTrocarPeriodo={trocarMes}
        rotulo="Vencimento"
        dica={DICA_VENCIMENTO}
        filtrosAtivos={filtrosAtivos}
        onAbrirFiltros={() => setFiltrosAbertos(true)}
      />

      <ResumoTransacoes
        quantidade={transacoesFiltradas.length}
        receitas={somar("RECEITA")}
        despesas={somar("DESPESA")}
        selecionadas={selecionadas.size}
        busca={busca}
        onBuscar={setBusca}
        onAdicionar={() => setEmEdicao("nova")}
        onApagarSelecionadas={() =>
          apagar(transacoesFiltradas.filter((t) => selecionadas.has(t.id)))
        }
      />

      <ChipsFiltros chips={chips} />

      {buscaAplicada && rotuloMes && (
        <p className={styles.aviso} role="status">
          Buscando só no vencimento de {rotuloMes}.
          <button type="button" onClick={() => trocarMes("")}>
            Buscar em todos os meses
          </button>
        </p>
      )}

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
          filtros={{ categoria, subcategoria, pagamento, de, ate }}
          opcoesCategoria={opcoesCategoria}
          opcoesSubcategoria={opcoesSubcategoria}
          opcoesPagamento={opcoesPagamento}
          onAplicar={aplicarFiltros}
          onFechar={() => setFiltrosAbertos(false)}
        />
      )}

      {emEdicao && (
        <ModalTransacao
          transacao={emEdicao === "nova" ? undefined : emEdicao}
          categorias={categorias}
          subcategorias={subcategorias}
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
