import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import form from "../Modal/Formulario.module.css";
import tipos from "../Transactions/ModalTransacao.module.css";
import { Modal } from "../Modal/Modal";
import { MAX_DIGITOS_VALOR, moeda } from "../../pages/Dashboard/formatadores";
import {
  salvarRecorrencia,
  type Categoria,
  type FormaPagamento,
  type Subcategoria,
  type TransacaoRecorrente,
} from "../../pages/Settings/api";

const schema = z
  .object({
    tipo: z.enum(["RECEITA", "DESPESA"]),
    valor: z.number().positive("Informe o valor."),
    descricao: z.string().trim().min(1, "Informe a descrição."),
    diaDoMes: z.string(),
    dataInicio: z.string().min(1, "Informe a data de início."),
    dataFim: z.string(),
    categoryId: z.string(),
    subcategoryId: z.string(),
    formaPagamentoId: z.string(),
  })
  .superRefine((dados, ctx) => {
    if (dados.dataFim && dados.dataFim < dados.dataInicio) {
      ctx.addIssue({
        code: "custom",
        path: ["dataFim"],
        message: "O término não pode ser antes do início.",
      });
    }
    if (dados.tipo !== "DESPESA") return;
    if (!dados.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Escolha a categoria.",
      });
    }
    if (!dados.formaPagamentoId) {
      ctx.addIssue({
        code: "custom",
        path: ["formaPagamentoId"],
        message: "Escolha a forma de pagamento.",
      });
    }
  });

type Dados = z.infer<typeof schema>;

type Props = {
  recorrencia?: TransacaoRecorrente;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  pagamentos: FormaPagamento[];
  onFechar: () => void;
  onSalvar: () => void;
};

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

function comAtual<T extends { id: number }>(lista: T[], atual?: T | null) {
  return atual && !lista.some((o) => o.id === atual.id)
    ? [...lista, atual]
    : lista;
}

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ModalRecorrencia({
  recorrencia,
  categorias: categoriasAtivas,
  subcategorias: subcategoriasAtivas,
  pagamentos: pagamentosAtivos,
  onFechar,
  onSalvar,
}: Props) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const editando = !!recorrencia;
  // Mantém os vínculos da recorrência na lista mesmo se já foram apagados.
  const categorias = comAtual(categoriasAtivas, recorrencia?.category);
  const subcategorias = comAtual(subcategoriasAtivas, recorrencia?.subcategory);
  const pagamentos = comAtual(pagamentosAtivos, recorrencia?.formaPagamento);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: recorrencia
      ? {
          tipo: recorrencia.tipo,
          valor: Number(recorrencia.valor),
          descricao: recorrencia.descricao,
          diaDoMes: String(recorrencia.diaDoMes),
          dataInicio: recorrencia.dataInicio.slice(0, 10),
          dataFim: recorrencia.dataFim?.slice(0, 10) ?? "",
          categoryId: recorrencia.categoryId
            ? String(recorrencia.categoryId)
            : "",
          subcategoryId: recorrencia.subcategoryId
            ? String(recorrencia.subcategoryId)
            : "",
          formaPagamentoId: recorrencia.formaPagamentoId
            ? String(recorrencia.formaPagamentoId)
            : "",
        }
      : {
          tipo: "DESPESA",
          valor: 0,
          descricao: "",
          diaDoMes: String(new Date().getDate()),
          dataInicio: hoje(),
          dataFim: "",
          categoryId: "",
          subcategoryId: "",
          formaPagamentoId: "",
        },
  });

  const [tipo, categoryId] = useWatch({
    control,
    name: ["tipo", "categoryId"],
  });
  const despesa = tipo === "DESPESA";
  const subcategoriasDaCategoria = subcategorias.filter(
    (s) => String(s.categoryId) === categoryId,
  );

  const onSubmit = async (dados: Dados) => {
    try {
      await salvarRecorrencia(
        {
          tipo: dados.tipo,
          valor: dados.valor,
          descricao: dados.descricao,
          diaDoMes: Number(dados.diaDoMes),
          dataInicio: dados.dataInicio,
          dataFim: dados.dataFim || null,
          categoryId: dados.categoryId ? Number(dados.categoryId) : null,
          subcategoryId:
            dados.categoryId && dados.subcategoryId
              ? Number(dados.subcategoryId)
              : null,
          formaPagamentoId:
            despesa && dados.formaPagamentoId
              ? Number(dados.formaPagamentoId)
              : null,
        },
        recorrencia?.id,
      );
      onSalvar();
    } catch (err) {
      setError("root", {
        message:
          err instanceof TypeError
            ? "Não foi possível conectar ao servidor."
            : err instanceof Error
              ? err.message
              : "Não foi possível salvar a transação recorrente.",
      });
    }
  };

  function aria(campo: keyof Dados) {
    return {
      id: `${id}-${campo}`,
      "aria-invalid": !!errors[campo],
      "aria-describedby": errors[campo] ? `${id}-${campo}-erro` : undefined,
    };
  }

  function erro(campo: keyof Dados) {
    return (
      errors[campo] && (
        <p className={form.erro} id={`${id}-${campo}-erro`}>
          {errors[campo].message}
        </p>
      )
    );
  }

  return (
    <Modal tituloId={tituloId} onFechar={onFechar}>
      <form className={form.form} noValidate onSubmit={handleSubmit(onSubmit)}>
        <header className={form.cabecalho}>
          <div>
            <h2 id={tituloId} className={form.titulo}>
              {editando
                ? "Editar transação recorrente"
                : "Adicionar transação recorrente"}
            </h2>
            <p className={form.subtitulo}>Campos com * são obrigatórios.</p>
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

        <fieldset className={tipos.tipos}>
          <legend className={form.oculto}>Tipo da transação</legend>
          <label className={`${tipos.tipo} ${tipos.tipoReceita}`}>
            <input type="radio" value="RECEITA" {...register("tipo")} />
            <span aria-hidden="true">▲</span> Receita
          </label>
          <label className={`${tipos.tipo} ${tipos.tipoDespesa}`}>
            <input type="radio" value="DESPESA" {...register("tipo")} />
            <span aria-hidden="true">▼</span> Despesa
          </label>
        </fieldset>

        <div className={form.grade}>
          <div className={form.campo}>
            <label htmlFor={`${id}-valor`}>Valor *</label>
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
            {erro("valor")}
          </div>

          <div className={form.campo}>
            <label htmlFor={`${id}-descricao`}>Descrição *</label>
            <input
              {...aria("descricao")}
              placeholder={despesa ? "Ex.: Aluguel" : "Ex.: Salário"}
              {...register("descricao")}
            />
            {erro("descricao")}
          </div>

          <div className={form.campo}>
            <label htmlFor={`${id}-diaDoMes`}>Todo dia *</label>
            <select {...aria("diaDoMes")} {...register("diaDoMes")}>
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </select>
          </div>

          <div className={form.campo}>
            <label htmlFor={`${id}-dataInicio`}>Começa em *</label>
            <input
              type="date"
              {...aria("dataInicio")}
              {...register("dataInicio")}
            />
            {erro("dataInicio")}
          </div>

          <div className={form.campo}>
            <label htmlFor={`${id}-dataFim`}>Termina em</label>
            <input type="date" {...aria("dataFim")} {...register("dataFim")} />
            {erro("dataFim")}
          </div>

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

        <p className={form.dica}>
          {editando
            ? "As mudanças valem para os próximos meses. O que já foi lançado não muda."
            : "Lança uma transação por mês nesse dia, a partir deste mês: meses passados não são lançados. Em meses mais curtos, os dias 29 a 31 caem no último dia."}
        </p>

        <footer className={form.rodape}>
          <button type="button" className={form.cancelar} onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className={form.salvar} disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando…"
              : editando
                ? "Salvar alterações"
                : "Salvar recorrência"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
