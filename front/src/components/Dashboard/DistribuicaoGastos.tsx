import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "../../pages/Dashboard/Dashboard.module.css";
import type { GastoCategoria } from "../../pages/Dashboard/api";
import { moeda, percentual } from "../../pages/Dashboard/formatadores";
import {
  distribuicaoDaCategoria,
  distribuicaoGeral,
  type Fatia,
} from "../../pages/Dashboard/distribuicao";
import { GraficoCard, RotuloPeriodo } from "./Layout";

type Props = {
  categorias: GastoCategoria[];
  totalDespesa: number;
  rotuloPeriodo: string;
};

// Coordenadas no viewBox 0..100; o furo central é 64% do raio, como antes.
const RAIO_EXTERNO = 50;
const RAIO_INTERNO = 32;
const RAIO_TOOLTIP = (RAIO_EXTERNO + RAIO_INTERNO) / 2;

function ponto(raio: number, fracao: number) {
  const angulo = fracao * 2 * Math.PI - Math.PI / 2;
  return {
    x: 50 + raio * Math.cos(angulo),
    y: 50 + raio * Math.sin(angulo),
  };
}

function arco(inicio: number, fim: number): string {
  // Um arco SVG não fecha o círculo inteiro: divide em duas metades.
  if (fim - inicio >= 0.9999) {
    return `${arco(inicio, inicio + 0.5)} ${arco(inicio + 0.5, inicio + 1)}`;
  }
  const grande = fim - inicio > 0.5 ? 1 : 0;
  const e0 = ponto(RAIO_EXTERNO, inicio);
  const e1 = ponto(RAIO_EXTERNO, fim);
  const i0 = ponto(RAIO_INTERNO, inicio);
  const i1 = ponto(RAIO_INTERNO, fim);
  return [
    `M ${e0.x} ${e0.y}`,
    `A ${RAIO_EXTERNO} ${RAIO_EXTERNO} 0 ${grande} 1 ${e1.x} ${e1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${RAIO_INTERNO} ${RAIO_INTERNO} 0 ${grande} 0 ${i0.x} ${i0.y}`,
    "Z",
  ].join(" ");
}

function posicionar(fatias: Fatia[], total: number) {
  let acumulado = 0;
  return fatias.map((fatia) => {
    const inicio = acumulado;
    acumulado += total > 0 ? fatia.valor / total : 0;
    return { fatia, inicio, fim: acumulado };
  });
}

function formatarPercentual(valor: number) {
  return `${percentual.format(valor)}%`;
}

export function DistribuicaoGastos({
  categorias,
  totalDespesa,
  rotuloPeriodo,
}: Props) {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [emDestaque, setEmDestaque] = useState<string | null>(null);
  const voltarRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const devolverFocoPara = useRef<string | null>(null);

  // Se a categoria some (ex.: recarregou sem ela), cai na visão geral.
  const categoria = categorias.find((c) => c.nome === selecionada);
  const detalhando = !!categoria;
  const { total, fatias } = categoria
    ? distribuicaoDaCategoria(categoria)
    : distribuicaoGeral(categorias, totalDespesa);
  const posicoes = posicionar(fatias, total);
  const destaque = posicoes.find((p) => p.fatia.chave === emDestaque);
  const referencia = detalhando ? "da categoria" : "do total";

  function abrir(nome: string) {
    // Ao voltar, o foco retorna à fatia dessa categoria.
    devolverFocoPara.current = nome;
    setEmDestaque(null);
    setSelecionada(nome);
  }

  function voltar() {
    setEmDestaque(null);
    setSelecionada(null);
  }

  useEffect(() => {
    if (detalhando) {
      voltarRef.current?.focus();
      return;
    }
    const nome = devolverFocoPara.current;
    if (!nome) return;
    devolverFocoPara.current = null;
    svgRef.current
      ?.querySelector<SVGPathElement>(`[data-chave="${CSS.escape(nome)}"]`)
      ?.focus();
  }, [detalhando]);

  useEffect(() => {
    if (!detalhando) return;
    function aoTeclar(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented) {
        setEmDestaque(null);
        setSelecionada(null);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [detalhando]);

  function teclaNaFatia(e: KeyboardEvent, nome: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir(nome);
    }
  }

  const tooltip =
    destaque &&
    (() => {
      const meio = ponto(RAIO_TOOLTIP, (destaque.inicio + destaque.fim) / 2);
      return (
        <div
          className={`${styles.tooltip} ${styles.donutTooltip}`}
          style={{ left: `${meio.x}%`, top: `${meio.y}%` }}
          role="tooltip"
        >
          <span className={styles.tooltipTitulo}>{destaque.fatia.nome}</span>
          <span className={styles.tooltipLinha}>
            {moeda.format(destaque.fatia.valor)} ·{" "}
            {formatarPercentual(destaque.fatia.percentual)} {referencia}
          </span>
        </div>
      );
    })();

  return (
    <GraficoCard
      titulo="Distribuição de gastos"
      extra={
        <div className={styles.donutAcoes}>
          {detalhando && (
            <button
              ref={voltarRef}
              type="button"
              className={styles.donutVoltar}
              onClick={voltar}
            >
              <span aria-hidden="true">←</span> Voltar
            </button>
          )}
          <RotuloPeriodo>{rotuloPeriodo}</RotuloPeriodo>
        </div>
      }
    >
      <span className="sr-only" role="status">
        {detalhando
          ? `Mostrando as subcategorias de ${categoria.nome}. Esc volta.`
          : ""}
      </span>

      <div
        key={selecionada ?? ""}
        className={`${styles.donutLayout} ${styles.donutTroca}`}
      >
        <div className={styles.donutArea}>
          <svg
            ref={svgRef}
            className={styles.donutSvg}
            viewBox="0 0 100 100"
            role="group"
            aria-label={
              detalhando
                ? `Subcategorias de ${categoria.nome}`
                : "Gastos por categoria. Escolha uma para ver as subcategorias."
            }
          >
            {fatias.length === 0 && (
              <path className={styles.donutVazio} d={arco(0, 1)} />
            )}

            {posicoes.map(({ fatia, inicio, fim }) => {
              const rotulo = `${fatia.nome}: ${moeda.format(fatia.valor)}, ${formatarPercentual(fatia.percentual)} ${referencia}`;
              const classes = [
                styles.donutFatia,
                fatias.length === 1 ? styles.donutSemBorda : "",
                detalhando ? "" : styles.donutFatiaClicavel,
                emDestaque === fatia.chave ? styles.donutFatiaAtiva : "",
              ].join(" ");

              return (
                <path
                  key={fatia.chave}
                  data-chave={fatia.chave}
                  className={classes}
                  d={arco(inicio, fim)}
                  fill={fatia.cor}
                  fillOpacity={fatia.opacidade}
                  onMouseEnter={() => setEmDestaque(fatia.chave)}
                  onMouseLeave={() => setEmDestaque(null)}
                  {...(detalhando
                    ? { "aria-label": rotulo, role: "img" }
                    : {
                        role: "button",
                        tabIndex: 0,
                        "aria-label": `${rotulo}. Ver subcategorias`,
                        onClick: () => abrir(fatia.nome),
                        onKeyDown: (e: KeyboardEvent) =>
                          teclaNaFatia(e, fatia.nome),
                        onFocus: () => setEmDestaque(fatia.chave),
                        onBlur: () => setEmDestaque(null),
                      })}
                />
              );
            })}
          </svg>

          <div className={styles.donutCentro}>
            <strong className={styles.donutTotal}>{moeda.format(total)}</strong>
            <span
              className={`${styles.donutRotulo} ${styles.donutRotuloLongo}`}
              title={categoria?.nome}
            >
              {categoria?.nome ?? "total de gastos"}
            </span>
          </div>

          {tooltip}
        </div>

        <ul className={styles.donutLegenda}>
          {fatias.length === 0 && (
            <li className={styles.donutLegendaVazia}>
              {detalhando
                ? "Nenhum gasto nesta categoria no período."
                : "Nenhum gasto no período."}
            </li>
          )}

          {fatias.map((f) => {
            const conteudo = (
              <>
                <span
                  className={styles.donutMarca}
                  style={{ background: f.cor, opacity: f.opacidade }}
                />
                <span className={styles.donutNome} title={f.nome}>
                  {f.nome}
                </span>
                <span className={styles.donutPercent}>
                  {formatarPercentual(f.percentual)}
                </span>
                <span className={styles.donutValor}>
                  {moeda.format(f.valor)}
                </span>
              </>
            );

            return detalhando ? (
              <li key={f.chave}>{conteudo}</li>
            ) : (
              <li key={f.chave} className={styles.donutLinhaBotao}>
                <button
                  type="button"
                  className={styles.donutItem}
                  aria-label={`Ver subcategorias de ${f.nome}: ${moeda.format(f.valor)}, ${formatarPercentual(f.percentual)} do total`}
                  onClick={() => abrir(f.nome)}
                >
                  {conteudo}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </GraficoCard>
  );
}
