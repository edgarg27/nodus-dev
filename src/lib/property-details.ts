import { z } from "zod";
import { ESTADOS_MX } from "./estados.ts";

// Datos del espacio (precio, superficies, servicios y datos industriales). Fuente única de las
// reglas para la API, el formulario de publicar y las tarjetas que los muestran.

export const MONEDAS = ["MXN", "USD"] as const;
export const UNIDADES_PRECIO = ["total", "m2"] as const;

export type Moneda = (typeof MONEDAS)[number];
export type UnidadPrecio = (typeof UNIDADES_PRECIO)[number];

const MONTO_MAXIMO = 999_999_999_999;

const monto = z.number().min(0).max(MONTO_MAXIMO).nullable();
const superficie = z.number().min(0).max(9_999_999_999).nullable();
const conteo = z.number().int().min(0).max(9_999).nullable();

// Cada campo es opcional (un PATCH puede no mandarlo) y nulo borra el valor.
export const detallesPropiedadSchema = z.object({
  precio: monto.optional(),
  moneda: z.enum(MONEDAS).optional(),
  precioUnidad: z.enum(UNIDADES_PRECIO).optional(),
  mantenimiento: monto.optional(),
  superficieConstruidaM2: superficie.optional(),
  superficieTerrenoM2: superficie.optional(),
  banos: conteo.optional(),
  estacionamientos: conteo.optional(),
  alturaLibreM: z.number().min(0).max(999).nullable().optional(),
  andenes: conteo.optional(),
  potenciaKva: z.number().int().min(0).max(9_999_999).nullable().optional(),
});

export type DetallesPropiedadInput = z.infer<typeof detallesPropiedadSchema>;

export const CAMPOS_DETALLE = [
  "precio",
  "moneda",
  "precioUnidad",
  "mantenimiento",
  "superficieConstruidaM2",
  "superficieTerrenoM2",
  "banos",
  "estacionamientos",
  "alturaLibreM",
  "andenes",
  "potenciaKva",
] as const satisfies readonly (keyof DetallesPropiedadInput)[];

export const CAMPOS_INDUSTRIALES = ["alturaLibreM", "andenes", "potenciaKva"] as const;

export interface DetallesPropiedad {
  precio: number | null;
  moneda: string;
  precioUnidad: string;
  mantenimiento: number | null;
  superficieConstruidaM2: number | null;
  superficieTerrenoM2: number | null;
  banos: number | null;
  estacionamientos: number | null;
  alturaLibreM: number | null;
  andenes: number | null;
  potenciaKva: number | null;
}

function formatoNumero(valor: number, decimales = 0): string {
  return valor.toLocaleString("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: Number.isInteger(valor) ? 0 : 2,
  });
}

// "$38,000 MXN /mes", "USD 4.50 /m² /mes", "$12,500,000 MXN" o "Precio a consultar".
export function formatearPrecio(
  detalles: Pick<DetallesPropiedad, "precio" | "moneda" | "precioUnidad">,
  modalidad: string,
): string {
  if (detalles.precio === null) return "Precio a consultar";
  const prefijo = detalles.moneda === "USD" ? "USD " : "$";
  const sufijoMoneda = detalles.moneda === "USD" ? "" : " MXN";
  const decimales = Number.isInteger(detalles.precio) ? 0 : 2;
  const porM2 = detalles.precioUnidad === "m2" ? " /m²" : "";
  const porMes = modalidad === "renta" ? " /mes" : "";
  return `${prefijo}${formatoNumero(detalles.precio, decimales)}${sufijoMoneda}${porM2}${porMes}`;
}

// Etiquetas cortas para tarjetas: "1,856 m²", "5 baños", "3 estacionamientos", "8 m de altura libre"…
export function resumenDetalles(detalles: DetallesPropiedad, tipo: string): string[] {
  const etiquetas: string[] = [];
  const superficie = detalles.superficieConstruidaM2 ?? detalles.superficieTerrenoM2;
  if (superficie !== null) etiquetas.push(`${formatoNumero(superficie)} m²`);
  if (detalles.banos !== null) {
    etiquetas.push(`${detalles.banos} ${detalles.banos === 1 ? "baño" : "baños"}`);
  }
  if (detalles.estacionamientos !== null) {
    etiquetas.push(
      `${detalles.estacionamientos} ${detalles.estacionamientos === 1 ? "estacionamiento" : "estacionamientos"}`,
    );
  }
  if (tipo === "nave_industrial") {
    if (detalles.alturaLibreM !== null) {
      etiquetas.push(`${formatoNumero(detalles.alturaLibreM)} m de altura libre`);
    }
    if (detalles.andenes !== null) {
      etiquetas.push(`${detalles.andenes} ${detalles.andenes === 1 ? "andén" : "andenes"}`);
    }
    if (detalles.potenciaKva !== null) {
      etiquetas.push(`${formatoNumero(detalles.potenciaKva)} kVA`);
    }
  }
  return etiquetas;
}

// Filas "etiqueta: valor" para la ficha del espacio; omite lo que no se capturó.
export function especificaciones(
  detalles: DetallesPropiedad,
  tipo: string,
): { etiqueta: string; valor: string }[] {
  const filas: { etiqueta: string; valor: string }[] = [];
  const agregar = (etiqueta: string, valor: number | null, sufijo = "") => {
    if (valor !== null) filas.push({ etiqueta, valor: `${formatoNumero(valor)}${sufijo}` });
  };
  if (detalles.mantenimiento !== null) {
    filas.push({
      etiqueta: "Mantenimiento",
      valor: formatearPrecio(
        { precio: detalles.mantenimiento, moneda: detalles.moneda, precioUnidad: "total" },
        "renta",
      ),
    });
  }
  agregar("Superficie construida", detalles.superficieConstruidaM2, " m²");
  agregar("Superficie de terreno", detalles.superficieTerrenoM2, " m²");
  agregar("Baños", detalles.banos);
  agregar("Estacionamientos", detalles.estacionamientos);
  if (tipo === "nave_industrial") {
    agregar("Altura libre", detalles.alturaLibreM, " m");
    agregar("Andenes", detalles.andenes);
    agregar("Carga eléctrica", detalles.potenciaKva, " kVA");
  }
  return filas;
}

// Toma los datos del espacio de una fila de la base o de la API (los numéricos pueden venir como
// string si alguien serializa a mano) y los deja listos para mostrar.
export function extraerDetalles(fila: Partial<Record<keyof DetallesPropiedad, unknown>>) {
  const numero = (valor: unknown): number | null => {
    if (valor === null || valor === undefined || valor === "") return null;
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : null;
  };
  return {
    precio: numero(fila.precio),
    moneda: typeof fila.moneda === "string" ? fila.moneda : "MXN",
    precioUnidad: typeof fila.precioUnidad === "string" ? fila.precioUnidad : "total",
    mantenimiento: numero(fila.mantenimiento),
    superficieConstruidaM2: numero(fila.superficieConstruidaM2),
    superficieTerrenoM2: numero(fila.superficieTerrenoM2),
    banos: numero(fila.banos),
    estacionamientos: numero(fila.estacionamientos),
    alturaLibreM: numero(fila.alturaLibreM),
    andenes: numero(fila.andenes),
    potenciaKva: numero(fila.potenciaKva),
  } satisfies DetallesPropiedad;
}

export const ETIQUETA_TIPO: Record<string, string> = {
  nave_industrial: "Nave industrial",
  oficina: "Oficina",
  local_comercial: "Local comercial",
};

export const ETIQUETA_MODALIDAD: Record<string, string> = {
  renta: "Renta",
  venta: "Venta",
  desde_cero: "Proyecto desde cero",
};

export const ETIQUETA_ESTADO: Record<string, string> = Object.fromEntries(
  ESTADOS_MX.map((estado) => [estado.codigo, estado.nombre]),
);

// "Nave industrial en renta en San Luis Potosí" — título de la ficha y de su metadata.
export function tituloEspacio(tipo: string, modalidad: string, ciudad: string): string {
  const nombre = ETIQUETA_TIPO[tipo] ?? tipo;
  const operacion =
    modalidad === "renta"
      ? "en renta"
      : modalidad === "venta"
        ? "en venta"
        : "como proyecto desde cero";
  return `${nombre} ${operacion} en ${ciudad}`;
}
