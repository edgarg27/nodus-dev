import { z } from "zod";

export const signUpSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.email("Ingresa un correo electrónico válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.enum(["buscador", "oferente"], "Selecciona un tipo de cuenta"),
  aceptaTerminos: z.literal(true, "Debes aceptar los términos y el aviso de privacidad"),
  ref: z.string().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export interface DetalleValidacion {
  field: string;
  message: string;
}

export type ResultadoValidarSignUp =
  | { ok: true; data: SignUpInput }
  | {
      ok: false;
      error: { code: "validation_error"; status: 422; details: DetalleValidacion[] };
    };

export function validarSignUp(input: unknown): ResultadoValidarSignUp {
  const resultado = signUpSchema.safeParse(input);
  if (!resultado.success) {
    const details = resultado.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return { ok: false, error: { code: "validation_error", status: 422, details } };
  }
  return { ok: true, data: resultado.data };
}

export function buildSignUpArgs(values: SignUpInput, ref: string | undefined, origin: string) {
  return {
    email: values.email,
    password: values.password,
    options: {
      data: {
        nombre: values.nombre,
        rol: values.rol,
        ...(ref ? { ref } : {}),
      },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  };
}
