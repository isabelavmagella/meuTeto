import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("Esse e-mail parece incompleto. Ex.: voce@exemplo.com"),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
});

export type LoginData = z.infer<typeof loginSchema>;
