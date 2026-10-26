import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styles from "./ModalCategoria.module.css";
import form from "../Modal/Formulario.module.css";
import { Modal } from "../Modal/Modal";
import { PALETA } from "./paleta";
import { salvarCategoria, type Categoria } from "../../pages/Settings/api";

const schema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  cor: z.string().min(1, "Escolha uma cor."),
});

type Dados = z.infer<typeof schema>;

type Props = {
  categoria?: Categoria;
  coresEmUso: string[];
  onFechar: () => void;
  onSalvar: () => void;
};

export function ModalCategoria({
  categoria,
  coresEmUso,
  onFechar,
  onSalvar,
}: Props) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const editando = !!categoria;
  const ocupadas = new Set(
    coresEmUso.filter((c) => c !== categoria?.cor).map((c) => c.toLowerCase()),
  );
  const primeiraLivre = PALETA.find((p) => !ocupadas.has(p.cor))?.cor ?? "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      nome: categoria?.nome ?? "",
      cor: categoria?.cor ?? primeiraLivre,
    },
  });

  const onSubmit = async (dados: Dados) => {
    try {
      await salvarCategoria(dados, categoria?.id);
      onSalvar();
    } catch (err) {
      setError("root", {
        message:
          err instanceof TypeError
            ? "Não foi possível conectar ao servidor."
            : err instanceof Error
              ? err.message
              : "Não foi possível salvar a categoria.",
      });
    }
  };

  return (
    <Modal tituloId={tituloId} onFechar={onFechar}>
      <form className={form.form} noValidate onSubmit={handleSubmit(onSubmit)}>
        <header className={form.cabecalho}>
          <div>
            <h2 id={tituloId} className={form.titulo}>
              {editando ? "Editar categoria" : "Adicionar categoria"}
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
            placeholder="Ex.: Mercado"
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

        <fieldset className={styles.cores}>
          <legend>Cor *</legend>
          <div className={styles.paleta}>
            {PALETA.map((p) => {
              const ocupada = ocupadas.has(p.cor);
              return (
                <label
                  key={p.cor}
                  className={styles.cor}
                  title={ocupada ? `${p.nome} (já usada)` : p.nome}
                >
                  <input
                    type="radio"
                    value={p.cor}
                    disabled={ocupada}
                    aria-label={ocupada ? `${p.nome}, já usada` : p.nome}
                    {...register("cor")}
                  />
                  <span style={{ background: p.cor }} aria-hidden="true" />
                </label>
              );
            })}
          </div>
          <p className={form.dica}>
            Cada cor pode ser usada por uma categoria só.
          </p>
          {errors.cor && <p className={form.erro}>{errors.cor.message}</p>}
        </fieldset>

        <footer className={form.rodape}>
          <button type="button" className={form.cancelar} onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className={form.salvar} disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando…"
              : editando
                ? "Salvar alterações"
                : "Salvar categoria"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
