import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./ModalTransacao.module.css";
import { Modal } from "../Modal/Modal";
import { transacaoSchema, type TransacaoData } from "./transacaoSchema";
import { moeda } from "../../pages/Dashboard/formatadores";
import {
  salvarTransacao,
  type Categoria,
  type FormaPagamento,
  type Transacao,
} from "../../pages/Transactions/api";

type Props = {
  transacao?: Transacao;
  categorias: Categoria[];
  pagamentos: FormaPagamento[];
  onFechar: () => void;
  onSalvar: () => void;
};

const PARCELAS = Array.from({ length: 48 }, (_, i) => i + 1);

function comAtual<T extends { id: number }>(lista: T[], atual?: T | null) {
  return atual && !lista.some((o) => o.id === atual.id)
    ? [...lista, atual]
    : lista;
}

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ModalTransacao({
  transacao,
  categorias: categoriasAtivas,
  pagamentos: pagamentosAtivos,
  onFechar,
  onSalvar,
}: Props) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const editando = !!transacao;
  const totalParcelasAtual = transacao?.totalParcelas ?? 1;
  const parcelada = totalParcelasAtual > 1;
  const categorias = comAtual(categoriasAtivas, transacao?.category);
  const pagamentos = comAtual(pagamentosAtivos, transacao?.formaPagamento);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TransacaoData>({
    resolver: zodResolver(transacaoSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: transacao
      ? {
          tipo: transacao.tipo,
          valor: Number(transacao.valor),
          descricao: transacao.descricao,
          data: transacao.data.slice(0, 10),
          totalParcelas: String(totalParcelasAtual),
          categoryId: transacao.categoryId ? String(transacao.categoryId) : "",
          formaPagamentoId: transacao.formaPagamentoId
            ? String(transacao.formaPagamentoId)
            : "",
        }
      : {
          tipo: "DESPESA",
          valor: 0,
          descricao: "",
          data: hoje(),
          totalParcelas: "1",
          categoryId: "",
          formaPagamentoId: "",
        },
  });

  const [tipo, categoryId, formaPagamentoId, valor, totalParcelas] = useWatch({
    control,
    name: ["tipo", "categoryId", "formaPagamentoId", "valor", "totalParcelas"],
  });
  const despesa = tipo === "DESPESA";
  const qtdParcelas = despesa ? Number(totalParcelas) : 1;
  const categoriaEscolhida = categorias.find(
    (c) => String(c.id) === categoryId,
  );
  const formaEscolhida = pagamentos.find(
    (p) => String(p.id) === formaPagamentoId,
  );
  const podeParcelar = !formaEscolhida || formaEscolhida.diaValidade != null;

  const onSubmit = async (dados: TransacaoData) => {
    try {
      await salvarTransacao(
        {
          tipo: dados.tipo,
          valor: dados.valor,
          descricao: dados.descricao,
          data: dados.data,
          categoryId: dados.categoryId ? Number(dados.categoryId) : null,
          ...(dados.tipo === "DESPESA" && {
            formaPagamentoId: Number(dados.formaPagamentoId),
            totalParcelas: editando
              ? totalParcelasAtual
              : podeParcelar
                ? Number(dados.totalParcelas)
                : 1,
          }),
        },
        transacao?.id,
      );
      onSalvar();
    } catch (err) {
      const message =
        err instanceof TypeError
          ? "Não foi possível conectar ao servidor."
          : err instanceof Error
            ? err.message
            : "Não foi possível salvar a transação.";
      setError("root", { message });
    }
  };

  function erro(campo: keyof TransacaoData) {
    const mensagem = errors[campo]?.message;
    return mensagem ? (
      <p className={styles.erro} id={`${id}-${campo}-erro`}>
        {mensagem}
      </p>
    ) : null;
  }

  function aria(campo: keyof TransacaoData) {
    return {
      id: `${id}-${campo}`,
      "aria-invalid": !!errors[campo],
      "aria-describedby": errors[campo] ? `${id}-${campo}-erro` : undefined,
    };
  }

  return (
    <Modal tituloId={tituloId} onFechar={onFechar}>
      <form
        className={styles.form}
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <header className={styles.cabecalho}>
          <div>
            <h2 id={tituloId} className={styles.titulo}>
              {editando ? "Editar transação" : "Adicionar transação"}
            </h2>
            <p className={styles.subtitulo}>Campos com * são obrigatórios.</p>
            {parcelada && (
              <p className={styles.aviso}>
                As alterações valem para todas as {totalParcelasAtual} parcelas
                desta compra.
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.fechar}
            aria-label="Fechar"
            onClick={onFechar}
          >
            ✕
          </button>
        </header>

        {errors.root?.message && (
          <p className={styles.erroGeral} role="alert">
            {errors.root.message}
          </p>
        )}

        <fieldset className={styles.tipos}>
          <legend className={styles.oculto}>Tipo da transação</legend>
          <label className={`${styles.tipo} ${styles.tipoReceita}`}>
            <input type="radio" value="RECEITA" {...register("tipo")} />
            <span aria-hidden="true">▲</span> Receita
          </label>
          <label className={`${styles.tipo} ${styles.tipoDespesa}`}>
            <input type="radio" value="DESPESA" {...register("tipo")} />
            <span aria-hidden="true">▼</span> Despesa
          </label>
        </fieldset>

        <div className={styles.grade}>
          <div className={styles.campo}>
            <label htmlFor={`${id}-valor`}>
              {qtdParcelas > 1 ? "Valor da parcela *" : "Valor *"}
            </label>
            <Controller
              name="valor"
              control={control}
              render={({ field }) => (
                <input
                  {...aria("valor")}
                  ref={field.ref}
                  data-autofocus
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={field.value ? moeda.format(field.value) : ""}
                  onBlur={field.onBlur}
                  onChange={(e) => {
                    const digitos = e.target.value.replace(/\D/g, "");
                    field.onChange(digitos ? Number(digitos) / 100 : 0);
                  }}
                />
              )}
            />
            {erro("valor") ??
              (qtdParcelas > 1 && (
                <p className={styles.dica}>
                  {valor > 0
                    ? `${qtdParcelas} × ${moeda.format(valor)} = ${moeda.format(qtdParcelas * valor)}`
                    : "Informe o valor de cada parcela, já com juros."}
                </p>
              ))}
          </div>

          <div className={styles.campo}>
            <label htmlFor={`${id}-descricao`}>Descrição *</label>
            <input
              {...aria("descricao")}
              placeholder={despesa ? "Ex.: Notebook" : "Ex.: Salário"}
              {...register("descricao")}
            />
            {erro("descricao")}
          </div>

          <div className={styles.campo}>
            <label htmlFor={`${id}-data`}>
              {despesa ? "Data da compra *" : "Data do recebimento *"}
            </label>
            <input type="date" {...aria("data")} {...register("data")} />
            {erro("data")}
          </div>

          {despesa && (
            <div className={styles.campo}>
              <label htmlFor={`${id}-totalParcelas`}>Total de parcelas</label>
              <select
                {...aria("totalParcelas")}
                disabled={editando || !podeParcelar}
                {...register("totalParcelas")}
              >
                {PARCELAS.map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "1x (à vista)" : `${n}x`}
                  </option>
                ))}
              </select>
              {editando ? (
                <p className={styles.dica}>
                  Pra mudar as parcelas, apague e lance de novo.
                </p>
              ) : (
                !podeParcelar && (
                  <p className={styles.dica}>
                    Só dá pra parcelar em formas com dia de vencimento.
                  </p>
                )
              )}
            </div>
          )}

          <div className={styles.campo}>
            <label htmlFor={`${id}-categoryId`}>
              {despesa ? "Categoria *" : "Categoria"}
            </label>
            <div className={styles.comPonto}>
              <span
                className={styles.ponto}
                style={{
                  background: categoriaEscolhida?.cor ?? "var(--border)",
                }}
                aria-hidden="true"
              />
              <select {...aria("categoryId")} {...register("categoryId")}>
                <option value="">
                  {despesa ? "Escolha uma categoria" : "Sem categoria"}
                </option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            {erro("categoryId")}
          </div>

          {despesa && (
            <div className={styles.campo}>
              <label htmlFor={`${id}-formaPagamentoId`}>
                Forma de pagamento *
              </label>
              <select
                {...aria("formaPagamentoId")}
                {...register("formaPagamentoId")}
              >
                <option value="">Escolha uma forma</option>
                {pagamentos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
              {erro("formaPagamentoId")}
            </div>
          )}
        </div>

        <footer className={styles.rodape}>
          <button type="button" className={styles.cancelar} onClick={onFechar}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.salvar}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Salvando…"
              : editando
                ? "Salvar alterações"
                : "Salvar transação"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
