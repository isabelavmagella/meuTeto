import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type LoginData, loginSchema } from "./loginSchema";
import { useAuth } from "../../contexts/auth";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { TextField } from "../../components/Form/TextField";
import { PasswordField } from "../../components/Form/PasswordField";
import { SubmitButton } from "../../components/Form/SubmitButton";
import { FormError } from "../../components/Form/FormError";
import { useNavigate } from "react-router-dom";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data.email, data.password);
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof TypeError
          ? "Não foi possível conectar ao servidor."
          : err instanceof Error
            ? err.message
            : "Erro ao fazer login";
      setError("root", { message });
    }
  };

  return (
    <AuthLayout
      titleId="login-title"
      title="Entrar"
      lead="Acesse sua conta com seu e-mail e senha."
      switchText="Ainda não tem conta?"
      switchLabel="Criar conta"
      switchTo="/register"
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormError message={errors.root?.message} />

        <TextField
          id="login-email"
          label="E-mail"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          error={errors.email?.message}
          registration={register("email")}
        />

        <PasswordField
          id="login-password"
          label="Senha"
          autoComplete="current-password"
          error={errors.password?.message}
          registration={register("password")}
        />

        <SubmitButton loading={isSubmitting}>Entrar</SubmitButton>
      </form>
    </AuthLayout>
  );
}
