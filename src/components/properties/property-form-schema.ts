import { z } from "zod";
import { normalizeAddress } from "@/lib/normalize-address";
import { type DetallesPropiedad, MONEDAS, UNIDADES_PRECIO } from "@/lib/property-details";
import type { PropertyFormPhoto } from "./property-photo-field";
import type { EstadoPublicacion } from "./status-badge";

export const TIPOS = ["nave_industrial", "oficina", "local_comercial"] as const;
export const MODALIDADES = ["renta", "venta", "desde_cero"] as const;
export const ESTADOS = ["SLP", "Aguascalientes", "Leon"] as const;

const LAT_MIN = 14.5;
const LAT_MAX = 32.7;
const LNG_MIN = -118.4;
const LNG_MAX = -86.7;

// Los inputs numéricos se manejan como texto (vacío = sin dato) y se convierten a número en el
// límite con la API (`property-form.tsx`), igual que los radios de financiamiento.
function campoNumerico(opciones: { entero?: boolean; maximo: number }) {
  return z
    .string()
    .trim()
    .optional()
    .refine(
      (valor) => {
        if (!valor) return true;
        const numero = Number(valor.replace(/,/g, ""));
        if (!Number.isFinite(numero) || numero < 0 || numero > opciones.maximo) return false;
        return !opciones.entero || Number.isInteger(numero);
      },
      opciones.entero ? "Escribe un número entero" : "Escribe un número válido",
    );
}

export const propertyFormSchema = z.object({
  tipo: z.enum(TIPOS),
  modalidad: z.enum(MODALIDADES),
  direccion: z.string().trim().min(1, "La dirección es obligatoria"),
  lat: z.number().min(LAT_MIN).max(LAT_MAX),
  lng: z.number().min(LNG_MIN).max(LNG_MAX),
  estado: z.enum(ESTADOS),
  ciudad: z.string().trim().min(1, "La ciudad es obligatoria"),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria"),
  // Los radios de HTML solo pueden reportar el string de su atributo `value` — RHF nunca aplica
  // `setValueAs` a inputs radio/checkbox (lee el DOM directo), así que el estado del formulario
  // se queda en "true"/"false" y la conversión a boolean ocurre en el límite con la API
  // (`property-form.tsx`, al armar el body del POST/PATCH).
  aceptaFinanciamiento: z.enum(["true", "false"]),
  precio: campoNumerico({ maximo: 999_999_999_999 }),
  moneda: z.enum(MONEDAS).optional(),
  precioUnidad: z.enum(UNIDADES_PRECIO).optional(),
  mantenimiento: campoNumerico({ maximo: 999_999_999_999 }),
  superficieConstruidaM2: campoNumerico({ maximo: 9_999_999_999 }),
  superficieTerrenoM2: campoNumerico({ maximo: 9_999_999_999 }),
  banos: campoNumerico({ entero: true, maximo: 9_999 }),
  estacionamientos: campoNumerico({ entero: true, maximo: 9_999 }),
  alturaLibreM: campoNumerico({ maximo: 999 }),
  andenes: campoNumerico({ entero: true, maximo: 9_999 }),
  potenciaKva: campoNumerico({ entero: true, maximo: 9_999_999 }),
});

export const CAMPOS_NUMERICOS_FORMULARIO = [
  "precio",
  "mantenimiento",
  "superficieConstruidaM2",
  "superficieTerrenoM2",
  "banos",
  "estacionamientos",
  "alturaLibreM",
  "andenes",
  "potenciaKva",
] as const;

export function textoANumero(valor: string | undefined): number | null {
  if (!valor?.trim()) return null;
  return Number(valor.replace(/,/g, ""));
}

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export interface PropertyFormInitialData extends DetallesPropiedad {
  id: string;
  tipo: (typeof TIPOS)[number];
  modalidad: (typeof MODALIDADES)[number];
  direccion: string;
  lat: number;
  lng: number;
  estado: (typeof ESTADOS)[number];
  ciudad: string;
  descripcion: string;
  aceptaFinanciamiento: boolean;
  estadoPublicacion: EstadoPublicacion;
  motivoRechazo: string | null;
  fotos: PropertyFormPhoto[];
}

// MapTiler devuelve la región por nombre ("San Luis Potosí", "Guanajuato"); el formulario usa
// códigos. León es el único mercado de Guanajuato (mismo criterio que `mapearEstado` en el
// servidor de geocoding), así que la región sola no basta: hace falta la ciudad.
export function estadoDesdeGeocode(
  region: string | null | undefined,
  ciudad?: string | null,
): (typeof ESTADOS)[number] | null {
  if (!region) return null;
  const normalizado = normalizeAddress(region);
  if (normalizado === "san luis potosi" || normalizado === "slp") return "SLP";
  if (normalizado === "aguascalientes") return "Aguascalientes";
  if (normalizado === "leon") return "Leon";
  if (normalizado === "guanajuato" && ciudad && normalizeAddress(ciudad) === "leon") return "Leon";
  return null;
}

export const selectClassName =
  "h-[46px] w-full min-w-0 rounded-lg border border-input bg-background px-3.5 text-[15px] text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export const inputClassName = "h-[46px] rounded-lg border-input bg-background px-3.5 text-[15px]";
