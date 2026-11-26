import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./ModalTransacao.module.css";
import form from "../Modal/Formulario.module.css";
import { Modal } from "../Modal/Modal";
import { transacaoSchema, type TransacaoData } from "./transacaoSchema";
import { MAX_DIGITOS_VALOR, moeda } from "../../pages/Dashboard/formatadores";
import {
  salvarTransacao,
  type Categoria,
  type FormaPagamento,
  type Subcategoria,
  type Transacao,
} from "../../pages/Transactions/api";

type Props = {
  transacao?: Transacao;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
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
  subcategorias: subcategoriasAtivas,
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
  const subcategorias = comAtual(subcategoriasAtivas, transacao?.subcategory);
  const pagamentos = comAtual(pagamentosAtivos, transacao?.formaPagamento);

  const {
    register,
    control,
    handleSubmit,
    setValue,
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
          subcategoryId: transacao.subcategoryId
            ? String(transacao.subcategoryId)
            : "",
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
          subcategoryId: "",
          formaPagamentoId: "",
        },
  });

  const [tipo, categoryId, formaPagamentoId, valor, totalParcelas] = useWatch({
    control,
    name: ["tipo", "categoryId", "formaPagamentoId", "valor", "totalParcelas"],
  });
  const despesa = tipo === "DESPESA";
  const qtdParcelas = despesa ? Number(totalParcelas) : 1;
  const subcategoriasDaCategoria = subcategorias.filter(
    (s) => String(s.categoryId) === categoryId,
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
          subcategoryId:
            dados.categoryId && dados.subcategoryId
              ? Number(dados.subcategoryId)
              : null,
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
      <p className={form.erro} id={`${id}-${campo}-erro`}>
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
      <form className={form.form} noValidate onSubmit={handleSubmit(onSubmit)}>
        <header className={form.cabecalho}>
          <div>
            <h2 id={tituloId} className={form.titulo}>
              {editando ? "Editar transação" : "Adicionar transação"}
            </h2>
            <p className={form.subtitulo}>Campos com * são obrigatórios.</p>
            {parcelada && (
              <p className={styles.aviso}>
                As alterações valem para todas as {totalParcelasAtual} parcelas
                desta compra.
              </p>
            )}
          </div>
          <button
            type="button"
            className={form.fechar}
            aria-label="Fechar"
            onClick={onFechar}
          >
            ✕
          </button>
        </header>

        {errors.root?.message && (
          <p className={form.erroGeral} role="alert">
            {errors.root.message}
          </p>
        )}

        <fieldset className={styles.tipos}>
          <legend className={form.oculto}>Tipo da transação</legend>
          <label className={`${styles.tipo} ${styles.tipoReceita}`}>
            <input type="radio" value="RECEITA" {...register("tipo")} />
            <span aria-hidden="true">▲</span> Receita
          </label>
          <label className={`${styles.tipo} ${styles.tipoDespesa}`}>
            <input type="radio" value="DESPESA" {...register("tipo")} />
            <span aria-hidden="true">▼</span> Despesa
          </label>
        </fieldset>

        <div className={form.grade}>
          <div className={form.campo}>
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
                    const digitos = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, MAX_DIGITOS_VALOR);
                    field.onChange(digitos ? Number(digitos) / 100 : 0);
                  }}
                />
              )}
            />
            {erro("valor") ??
              (qtdParcelas > 1 && (
                <p className={form.dica}>
                  {valor > 0
                    ? `${qtdParcelas} × ${moeda.format(valor)} = ${moeda.format(qtdParcelas * valor)}`
                    : "Informe o valor de cada parcela, já com juros."}
                </p>
              ))}
          </div>

          <div className={form.campo}>
            <label htmlFor={`${id}-descricao`}>Descrição *</label>
            <input
              {...aria("descricao")}
              placeholder={despesa ? "Ex.: Notebook" : "Ex.: Salário"}
              {...register("descricao")}
            />
            {erro("descricao")}
          </div>

          <div className={form.campo}>
            <label htmlFor={`${id}-data`}>
              {despesa ? "Data da compra *" : "Data do recebimento *"}
            </label>
            <input type="date" {...aria("data")} {...register("data")} />
            {erro("data")}
          </div>

          {despesa && (
            <div className={form.campo}>
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
                <p className={form.dica}>
                  Pra mudar as parcelas, apague e lance de novo.
                </p>
              ) : (
                !podeParcelar && (
                  <p className={form.dica}>
                    Só dá pra parcelar em formas com dia de vencimento.
                  </p>
                )
              )}
            </div>
          )}

          <div className={form.campo}>
            <label htmlFor={`${id}-categoryId`}>
              {despesa ? "Categoria *" : "Categoria"}
            </label>
            <select
              {...aria("categoryId")}
              {...register("categoryId", {
                onChange: () => setValue("subcategoryId", ""),
              })}
            >
              <option value="">
                {despesa ? "Escolha uma categoria" : "Sem categoria"}
              </option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {erro("categoryId")}
          </div>

          <div className={form.campo}>
            <label htmlFor={`${id}-subcategoryId`}>Subcategoria</label>
            <select
              {...aria("subcategoryId")}
              disabled={subcategoriasDaCategoria.length === 0}
              {...register("subcategoryId")}
            >
              <option value="">
                {!categoryId
                  ? "Escolha a categoria antes"
                  : subcategoriasDaCategoria.length === 0
                    ? "Nenhuma nesta categoria"
                    : "Sem subcategoria"}
              </option>
              {subcategoriasDaCategoria.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
            {erro("subcategoryId")}
          </div>

          {despesa && (
            <div className={form.campo}>
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

        <footer className={form.rodape}>
          <button type="button" className={form.cancelar} onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className={form.salvar} disabled={isSubmitting}>
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
