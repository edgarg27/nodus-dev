import { z } from "zod";
import { datosOferenteSchema } from "./datos-oferente.ts";

// El registro NO pide contraseña: la persona la crea después de confirmar su correo
// (/crear-contrasena). Así nadie usa una cuenta con un correo que no es suyo.
const baseSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.email("Ingresa un correo electrónico válido"),
  rol: z.enum(["buscador", "oferente"], "Selecciona un tipo de cuenta"),
  aceptaTerminos: z.literal(true, "Debes aceptar los términos y el aviso de privacidad"),
  ref: z.string().optional(),
  // Solo para oferentes (ver superRefine).
  telefono: z.string().optional(),
  tipoAnunciante: z.string().optional(),
  empresa: z.string().optional(),
});

// Quien ofrece espacios además deja teléfono, cómo publica y, si es inmobiliaria, su nombre.
// `when`: se valida aunque otro campo falle (p. ej. términos sin aceptar), para mostrar todos los
// errores juntos.
export const signUpSchema = baseSchema.superRefine(
  (valores, ctx) => {
    if (valores.rol !== "oferente") return;
    const datos = datosOferenteSchema.safeParse(valores);
    if (datos.success) return;
    for (const issue of datos.error.issues) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
  },
  { when: (payload) => (payload.value as { rol?: unknown } | undefined)?.rol === "oferente" },
);

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

// Contraseña provisional, aleatoria y nunca mostrada: Supabase la exige para registrar, pero la
// cuenta solo se usa tras confirmar el correo y crear la contraseña real. Cumple cualquier
// política de complejidad (mayúscula, minúscula, número y símbolo).
export function contrasenaProvisional(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const aleatorio = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${aleatorio}Aa1!`;
}

export function buildSignUpArgs(
  values: SignUpInput,
  ref: string | undefined,
  origin: string,
  password: string = contrasenaProvisional(),
) {
  const esOferente = values.rol === "oferente";
  return {
    email: values.email,
    password,
    options: {
      data: {
        nombre: values.nombre,
        rol: values.rol,
        // Al confirmar el correo, /auth/confirm manda a crear la contraseña.
        crear_password: true,
        ...(ref ? { ref } : {}),
        ...(esOferente
          ? {
              telefono: values.telefono?.trim(),
              tipo_anunciante: values.tipoAnunciante,
              ...(values.empresa?.trim() ? { empresa: values.empresa.trim() } : {}),
            }
          : {}),
      },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  };
}
