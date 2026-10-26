import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import form from "../Modal/Formulario.module.css";
import { Modal } from "../Modal/Modal";
import {
  salvarFormaPagamento,
  type FormaPagamento,
} from "../../pages/Settings/api";

const schema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  diaValidade: z.string(),
  diaFechamento: z.string(),
});

type Dados = z.infer<typeof schema>;

type Props = {
  forma?: FormaPagamento;
  onFechar: () => void;
  onSalvar: () => void;
};

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

export function ModalFormaPagamento({ forma, onFechar, onSalvar }: Props) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const editando = !!forma;

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
      nome: forma?.nome ?? "",
      diaValidade: forma?.diaValidade ? String(forma.diaValidade) : "",
      diaFechamento: forma?.diaFechamento ? String(forma.diaFechamento) : "",
    },
  });

  const diaValidade = useWatch({ control, name: "diaValidade" });

  const onSubmit = async (dados: Dados) => {
    try {
      await salvarFormaPagamento(
        {
          nome: dados.nome,
          diaValidade: dados.diaValidade ? Number(dados.diaValidade) : null,
          diaFechamento:
            dados.diaValidade && dados.diaFechamento
              ? Number(dados.diaFechamento)
              : null,
        },
        forma?.id,
      );
      onSalvar();
    } catch (err) {
      setError("root", {
        message:
          err instanceof TypeError
            ? "Não foi possível conectar ao servidor."
            : err instanceof Error
              ? err.message
              : "Não foi possível salvar a forma de pagamento.",
      });
    }
  };

  return (
    <Modal tituloId={tituloId} onFechar={onFechar}>
      <form className={form.form} noValidate onSubmit={handleSubmit(onSubmit)}>
        <header className={form.cabecalho}>
          <div>
            <h2 id={tituloId} className={form.titulo}>
              {editando
                ? "Editar forma de pagamento"
                : "Adicionar forma de pagamento"}
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
          <label htmlFor={`${id}-nome`}>Nome *</label>
          <input
            id={`${id}-nome`}
            data-autofocus
            placeholder="Ex.: Nubank, Pix, Débito"
            aria-invalid={!!errors.nome}
            aria-describedby={errors.nome ? `${id}-nome-erro` : undefined}
            {...register("nome")}
          />
          {errors.nome && (
            <p className={form.erro} id={`${id}-nome-erro`}>
              {errors.nome.message}
            </p>
          )}
        </div>

        <div className={form.grade}>
          <div className={form.campo}>
            <label htmlFor={`${id}-validade`}>Dia do vencimento</label>
            <select id={`${id}-validade`} {...register("diaValidade")}>
              <option value="">Sem vencimento</option>
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </select>
          </div>

          <div className={form.campo}>
            <label htmlFor={`${id}-fechamento`}>Dia do fechamento</label>
            <select
              id={`${id}-fechamento`}
              disabled={!diaValidade}
              {...register("diaFechamento")}
            >
              <option value="">Sem fechamento</option>
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className={form.dica}>
          Com o vencimento, dá pra lançar compras parceladas (cartão, boleto ou
          carnê). Em cartão de crédito, preencha também o fechamento para a
          compra cair na fatura certa.
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
                : "Salvar forma de pagamento"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
