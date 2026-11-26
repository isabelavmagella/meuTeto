import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { FormError } from "../../components/Form/FormError";
import { SubmitButton } from "../../components/Form/SubmitButton";
import { useAuth } from "../../contexts/auth";
import { API_URL, CADASTRO_LIBERADO } from "../../lib/api";
import styles from "./Inicio.module.css";

const RECURSOS = [
  "Dashboard com receitas, despesas e saldo do mês",
  "Transações com parcelas, cartão de crédito e vencimentos",
  "Categorias, orçamentos e lançamentos recorrentes",
];

export function Inicio() {
  const { entrarDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const aviso = (location.state as { aviso?: string } | null)?.aviso;
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  // O banco gratuito dorme quando ninguém usa: já vai acordando enquanto a
  // pessoa lê a tela.
  useEffect(() => {
    fetch(`${API_URL}/health/db`).catch(() => {});
  }, []);

  async function experimentar(e: FormEvent) {
    e.preventDefault();
    if (criando) return;
    setCriando(true);
    setErro("");
    try {
      await entrarDemo();
      navigate("/", { replace: true });
    } catch (err) {
      setErro(
        err instanceof TypeError
          ? "Não foi possível conectar ao servidor. Tente de novo."
          : err instanceof Error
            ? err.message
            : "Não foi possível criar a demonstração.",
      );
      setCriando(false);
    }
  }

  return (
    <AuthLayout
      titleId="inicio-title"
      title="Meu Teto"
      lead="Controle financeiro pessoal: veja para onde vai o seu dinheiro, mês a mês."
    >
      {aviso && (
        <p className={styles.aviso} role="status">
          {aviso}
        </p>
      )}

      <ul className={styles.recursos}>
        {RECURSOS.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <form noValidate onSubmit={experimentar}>
        <FormError message={erro} />
        <SubmitButton loading={criando}>Experimentar o app</SubmitButton>
      </form>

      <p className={styles.nota} aria-live="polite">
        {criando
          ? "Preparando seu ambiente com dados de exemplo… pode levar alguns segundos."
          : "Sem cadastro. Você recebe uma conta temporária com dados de exemplo, apagada em até 6 horas."}
      </p>

      {CADASTRO_LIBERADO && (
        <p className={styles.nota}>
          Ambiente local: <Link to="/login">entrar</Link> ou{" "}
          <Link to="/register">criar conta</Link>.
        </p>
      )}
    </AuthLayout>
  );
}
