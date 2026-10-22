import { Mail, User } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { type RegisterData, registerSchema } from "./registerSchema";
import { PasswordStrength } from "./PasswordStrength";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { TextField } from "../../components/Form/TextField";
import { PasswordField } from "../../components/Form/PasswordField";
import { SubmitButton } from "../../components/Form/SubmitButton";
import { FormError } from "../../components/Form/FormError";
import formStyles from "../../components/Form/Form.module.css";

export function Register() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const password = useWatch({ control, name: "password", defaultValue: "" });

  const onSubmit = async (data: RegisterData) => {
    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = body.error ?? "Erro ao criar conta";
        if (res.status === 409) {
          setError("email", { message });
        } else {
          setError("root", { message });
        }
        return;
      }

      navigate("/login");
    } catch {
      setError("root", { message: "Não foi possível conectar ao servidor." });
    }
  };

  return (
    <AuthLayout
      titleId="signup-title"
      title="Criar conta"
      lead="Leva menos de um minuto."
      switchText="Já tem conta?"
      switchLabel="Entrar"
      switchTo="/login"
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormError message={errors.root?.message} />

        <TextField
          id="signup-name"
          label="Nome"
          icon={User}
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          placeholder="Seu nome completo"
          error={errors.name?.message}
          registration={register("name")}
        />

        <TextField
          id="signup-email"
          label="E-mail"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          error={errors.email?.message}
          registration={register("email")}
        />

        <PasswordField
          id="signup-password"
          label="Senha"
          autoComplete="new-password"
          describedBy="signup-password-hint"
          error={errors.password?.message}
          registration={register("password")}
        >
          <PasswordStrength password={password} />
          <p className={formStyles.hint} id="signup-password-hint">
            Use pelo menos 8 caracteres. Misturar maiúsculas, números e
            símbolos deixa a senha mais forte.
          </p>
        </PasswordField>

        <SubmitButton loading={isSubmitting}>Criar conta</SubmitButton>
      </form>
    </AuthLayout>
  );
}
