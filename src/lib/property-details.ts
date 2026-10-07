import { z } from "zod";
import { ESTADOS_MX } from "./estados.ts";
import { type Idioma, localeDe, textosDe } from "./i18n/index.ts";

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

function formatoNumero(valor: number, decimales = 0, idioma: Idioma = "es"): string {
  return valor.toLocaleString(localeDe(idioma), {
    minimumFractionDigits: decimales,
    maximumFractionDigits: Number.isInteger(valor) ? 0 : 2,
  });
}

// "$38,000 MXN /mes", "USD 4.50 /m² /mes", "$12,500,000 MXN" o "Precio a consultar".
// El idioma solo cambia "/mes" y "Precio a consultar" (los paneles internos usan el default).
export function formatearPrecio(
  detalles: Pick<DetallesPropiedad, "precio" | "moneda" | "precioUnidad">,
  modalidad: string,
  idioma: Idioma = "es",
): string {
  const t = textosDe(idioma).detalles;
  if (detalles.precio === null) return t.precioAConsultar;
  const prefijo = detalles.moneda === "USD" ? "USD " : "$";
  const sufijoMoneda = detalles.moneda === "USD" ? "" : " MXN";
  const decimales = Number.isInteger(detalles.precio) ? 0 : 2;
  const porM2 = detalles.precioUnidad === "m2" ? " /m²" : "";
  const porMes = modalidad === "renta" ? t.porMes : "";
  return `${prefijo}${formatoNumero(detalles.precio, decimales, idioma)}${sufijoMoneda}${porM2}${porMes}`;
}

// Etiquetas cortas para tarjetas: "1,856 m²", "5 baños", "3 estacionamientos", "8 m de altura libre"…
export function resumenDetalles(
  detalles: DetallesPropiedad,
  tipo: string,
  idioma: Idioma = "es",
): string[] {
  const t = textosDe(idioma).detalles;
  const etiquetas: string[] = [];
  const superficie = detalles.superficieConstruidaM2 ?? detalles.superficieTerrenoM2;
  if (superficie !== null) etiquetas.push(`${formatoNumero(superficie, 0, idioma)} m²`);
  if (detalles.banos !== null) etiquetas.push(t.banos(detalles.banos));
  if (detalles.estacionamientos !== null) {
    etiquetas.push(t.estacionamientos(detalles.estacionamientos));
  }
  if (tipo === "nave_industrial") {
    if (detalles.alturaLibreM !== null) {
      etiquetas.push(t.alturaLibre(formatoNumero(detalles.alturaLibreM, 0, idioma)));
    }
    if (detalles.andenes !== null) etiquetas.push(t.andenes(detalles.andenes));
    if (detalles.potenciaKva !== null) {
      etiquetas.push(`${formatoNumero(detalles.potenciaKva, 0, idioma)} kVA`);
    }
  }
  return etiquetas;
}

// Filas "etiqueta: valor" para la ficha del espacio; omite lo que no se capturó.
export function especificaciones(
  detalles: DetallesPropiedad,
  tipo: string,
  idioma: Idioma = "es",
): { etiqueta: string; valor: string }[] {
  const t = textosDe(idioma).detalles;
  const filas: { etiqueta: string; valor: string }[] = [];
  const agregar = (etiqueta: string, valor: number | null, sufijo = "") => {
    if (valor !== null) {
      filas.push({ etiqueta, valor: `${formatoNumero(valor, 0, idioma)}${sufijo}` });
    }
  };
  if (detalles.mantenimiento !== null) {
    filas.push({
      etiqueta: t.etiquetaMantenimiento,
      valor: formatearPrecio(
        { precio: detalles.mantenimiento, moneda: detalles.moneda, precioUnidad: "total" },
        "renta",
        idioma,
      ),
    });
  }
  agregar(t.etiquetaSuperficieConstruida, detalles.superficieConstruidaM2, " m²");
  agregar(t.etiquetaSuperficieTerreno, detalles.superficieTerrenoM2, " m²");
  agregar(t.etiquetaBanos, detalles.banos);
  agregar(t.etiquetaEstacionamientos, detalles.estacionamientos);
  if (tipo === "nave_industrial") {
    agregar(t.etiquetaAlturaLibre, detalles.alturaLibreM, " m");
    agregar(t.etiquetaAndenes, detalles.andenes);
    agregar(t.etiquetaCargaElectrica, detalles.potenciaKva, " kVA");
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
export function tituloEspacio(
  tipo: string,
  modalidad: string,
  ciudad: string,
  idioma: Idioma = "es",
): string {
  const t = textosDe(idioma);
  return t.ficha.titulo(
    t.etiquetas.tipo[tipo] ?? tipo,
    t.etiquetas.operacion[modalidad] ?? modalidad,
    ciudad,
  );
}
