import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import form from "../Modal/Formulario.module.css";
import { Modal } from "../Modal/Modal";
import { moeda } from "../../pages/Dashboard/formatadores";
import {
  salvarOrcamento,
  type Categoria,
  type Orcamento,
} from "../../pages/Settings/api";

const schema = z.object({
  categoryId: z.string().min(1, "Escolha a categoria."),
  mesAno: z.string().regex(/^\d{4}-\d{2}$/, "Informe o mês."),
  valorLimite: z.number().positive("Informe o valor limite."),
});

type Dados = z.infer<typeof schema>;

type Props = {
  orcamento?: Orcamento;
  categorias: Categoria[];
  onFechar: () => void;
  onSalvar: () => void;
};

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

export function ModalOrcamento({
  orcamento,
  categorias,
  onFechar,
  onSalvar,
}: Props) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const editando = !!orcamento;

  // Mantém a categoria do orçamento na lista mesmo se ela já foi apagada.
  const opcoes =
    orcamento && !categorias.some((c) => c.id === orcamento.categoryId)
      ? [...categorias, orcamento.category]
      : categorias;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      categoryId: orcamento ? String(orcamento.categoryId) : "",
      mesAno: orcamento ? orcamento.mes.slice(0, 7) : mesAtual(),
      valorLimite: orcamento ? Number(orcamento.valorLimite) : 0,
    },
  });

  const onSubmit = async (dados: Dados) => {
    try {
      await salvarOrcamento(
        {
          categoryId: Number(dados.categoryId),
          mesAno: dados.mesAno,
          valorLimite: dados.valorLimite,
        },
        orcamento?.id,
      );
      onSalvar();
    } catch (err) {
      setError("root", {
        message:
          err instanceof TypeError
            ? "Não foi possível conectar ao servidor."
            : err instanceof Error
              ? err.message
              : "Não foi possível salvar o orçamento.",
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
              {editando ? "Editar orçamento" : "Adicionar orçamento"}
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

        <div className={form.campo}>
          <label htmlFor={`${id}-categoryId`}>Categoria *</label>
          <select
            data-autofocus
            {...aria("categoryId")}
            {...register("categoryId")}
          >
            <option value="">Escolha a categoria</option>
            {opcoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {erro("categoryId")}
        </div>

        <div className={form.grade}>
          <div className={form.campo}>
            <label htmlFor={`${id}-mesAno`}>Mês *</label>
            <input type="month" {...aria("mesAno")} {...register("mesAno")} />
            {erro("mesAno")}
          </div>

          <div className={form.campo}>
            <label htmlFor={`${id}-valorLimite`}>Valor limite *</label>
            <Controller
              name="valorLimite"
              control={control}
              render={({ field }) => (
                <input
                  {...aria("valorLimite")}
                  ref={field.ref}
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
            {erro("valorLimite")}
          </div>
        </div>

        <p className={form.dica}>
          O painel compara os gastos da categoria no mês com esse limite.
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
                : "Salvar orçamento"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
