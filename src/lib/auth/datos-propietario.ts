import { z } from "zod";

// Datos que pedimos a quien publica espacios: en el registro como propietario y cuando un buscador
// pasa a publicar ("Publica tu espacio"). Fuente única de las reglas para el formulario y la API.

export const TIPOS_ANUNCIANTE = ["particular", "inmobiliaria"] as const;
export type TipoAnunciante = (typeof TIPOS_ANUNCIANTE)[number];

// Dígitos con lada, espacios, guiones, paréntesis y un "+" inicial; entre 10 y 15 dígitos.
const TELEFONO = /^\+?[\d\s()-]+$/;

export function digitosTelefono(telefono: string): number {
  return telefono.replace(/\D/g, "").length;
}

export const datosPropietarioSchema = z
  .object({
    telefono: z
      .string()
      .trim()
      .min(1, "El teléfono es obligatorio")
      .regex(TELEFONO, "Teléfono inválido")
      .refine((valor) => {
        const digitos = digitosTelefono(valor);
        return digitos >= 10 && digitos <= 15;
      }, "Teléfono inválido"),
    tipoAnunciante: z.enum(TIPOS_ANUNCIANTE, "Elige cómo publicas"),
    empresa: z.string().trim().max(120).optional(),
  })
  .refine((datos) => datos.tipoAnunciante !== "inmobiliaria" || !!datos.empresa, {
    path: ["empresa"],
    message: "Escribe el nombre de tu inmobiliaria o empresa",
  });

export type DatosPropietario = z.infer<typeof datosPropietarioSchema>;

// Lee los datos del propietario de la metadata del registro (la fija el propio cliente: se valida
// igual que el formulario y lo inválido se ignora).
export function datosPropietarioDeMetadata(
  metadata: Record<string, unknown>,
): DatosPropietario | null {
  const resultado = datosPropietarioSchema.safeParse({
    telefono: metadata.telefono,
    tipoAnunciante: metadata.tipo_anunciante,
    empresa:
      typeof metadata.empresa === "string" && metadata.empresa ? metadata.empresa : undefined,
  });
  return resultado.success ? resultado.data : null;
}
