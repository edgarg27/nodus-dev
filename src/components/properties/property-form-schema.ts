import { z } from "zod";
import { CODIGOS_ESTADO, type CodigoEstado, estadoDesdeNombre } from "@/lib/estados";
import { type Textos, textosDe } from "@/lib/i18n";
import { type DetallesPropiedad, MONEDAS, UNIDADES_PRECIO } from "@/lib/property-details";
import type { PropertyFormPhoto } from "./property-photo-field";
import type { EstadoPublicacion } from "./status-badge";

export const TIPOS = ["nave_industrial", "oficina", "local_comercial"] as const;
export const MODALIDADES = ["renta", "venta", "desde_cero"] as const;
export const ESTADOS = CODIGOS_ESTADO;

const LAT_MIN = 14.5;
const LAT_MAX = 32.7;
const LNG_MIN = -118.4;
const LNG_MAX = -86.7;

// Los inputs numéricos se manejan como texto (vacío = sin dato) y se convierten a número en el
// límite con la API (`property-form.tsx`), igual que los radios de financiamiento.
type MensajesFormulario = Textos["panel"]["formulario"];

function campoNumerico(opciones: { entero?: boolean; maximo: number }, m: MensajesFormulario) {
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
      opciones.entero ? m.errorEntero : m.errorNumero,
    );
}

// El esquema se arma con los mensajes del idioma activo (el formulario usa crearPropertyFormSchema);
// propertyFormSchema es la versión en español.
export function crearPropertyFormSchema(m: MensajesFormulario) {
  return z.object({
    tipo: z.enum(TIPOS),
    modalidad: z.enum(MODALIDADES),
    direccion: z.string().trim().min(1, m.errorDireccion),
    lat: z.number().min(LAT_MIN).max(LAT_MAX),
    lng: z.number().min(LNG_MIN).max(LNG_MAX),
    estado: z.enum(ESTADOS),
    ciudad: z.string().trim().min(1, m.errorCiudad),
    descripcion: z.string().trim().min(1, m.errorDescripcion),
    // Los radios de HTML solo pueden reportar el string de su atributo `value` — RHF nunca aplica
    // `setValueAs` a inputs radio/checkbox (lee el DOM directo), así que el estado del formulario
    // se queda en "true"/"false" y la conversión a boolean ocurre en el límite con la API
    // (`property-form.tsx`, al armar el body del POST/PATCH).
    aceptaFinanciamiento: z.enum(["true", "false"]),
    precio: campoNumerico({ maximo: 999_999_999_999 }, m),
    moneda: z.enum(MONEDAS).optional(),
    precioUnidad: z.enum(UNIDADES_PRECIO).optional(),
    mantenimiento: campoNumerico({ maximo: 999_999_999_999 }, m),
    superficieConstruidaM2: campoNumerico({ maximo: 9_999_999_999 }, m),
    superficieTerrenoM2: campoNumerico({ maximo: 9_999_999_999 }, m),
    banos: campoNumerico({ entero: true, maximo: 9_999 }, m),
    estacionamientos: campoNumerico({ entero: true, maximo: 9_999 }, m),
    alturaLibreM: campoNumerico({ maximo: 999 }, m),
    andenes: campoNumerico({ entero: true, maximo: 9_999 }, m),
    potenciaKva: campoNumerico({ entero: true, maximo: 9_999_999 }, m),
    // Identificación y Red inmobiliaria (los selects de sí/no se manejan como "true"/"false").
    referencia: z.string().trim().max(60, m.errorMaximo(60)).optional(),
    titulo: z.string().trim().max(160, m.errorMaximo(160)).optional(),
    contactoId: z.string().optional(),
    compartidaEnRed: z.enum(["true", "false"]).optional(),
    exclusiva: z.enum(["true", "false"]).optional(),
    comisionPct: campoNumerico({ maximo: 100 }, m),
  });
}

export const propertyFormSchema = crearPropertyFormSchema(textosDe("es").panel.formulario);

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
  estado: CodigoEstado;
  ciudad: string;
  descripcion: string;
  aceptaFinanciamiento: boolean;
  referencia: string | null;
  titulo: string | null;
  contactoId: string | null;
  compartidaEnRed: boolean;
  comisionPct: number | null;
  exclusiva: boolean;
  estadoPublicacion: EstadoPublicacion;
  motivoRechazo: string | null;
  fotos: PropertyFormPhoto[];
}

// MapTiler devuelve la región por nombre ("San Luis Potosí", "Guanajuato"); el formulario usa
// códigos (src/lib/estados.ts). La ciudad ya no se necesita: se conserva el parámetro por
// compatibilidad con quien lo llama.
export function estadoDesdeGeocode(
  region: string | null | undefined,
  _ciudad?: string | null,
): CodigoEstado | null {
  return estadoDesdeNombre(region);
}

export const selectClassName =
  "h-[46px] w-full min-w-0 rounded-lg border border-input bg-background px-3.5 text-[15px] text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export const inputClassName = "h-[46px] rounded-lg border-input bg-background px-3.5 text-[15px]";
