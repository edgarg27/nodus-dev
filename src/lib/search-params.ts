import { MONEDAS, type Moneda } from "./property-details.ts";

// Fuente única de los parámetros de /buscar y de GET /api/v1/properties: la página, la API, el
// selector de orden y "Cargar más" leen y arman la URL con estas funciones, así ningún filtro se
// pierde al cambiar el orden o al paginar.

export const MODALIDADES_BUSQUEDA = ["renta", "venta", "desde_cero"] as const;
export const TIPOS_BUSQUEDA = ["nave_industrial", "oficina", "local_comercial"] as const;
export const ESTADOS_BUSQUEDA = ["SLP", "Aguascalientes", "Leon"] as const;
export const ORDENES_BUSQUEDA = [
  "relevancia",
  "recientes",
  "precio_asc",
  "precio_desc",
  "superficie_desc",
] as const;

export type OrdenBusqueda = (typeof ORDENES_BUSQUEDA)[number];

export const ETIQUETAS_ORDEN: Record<OrdenBusqueda, string> = {
  relevancia: "Relevancia",
  recientes: "Más recientes",
  precio_asc: "Precio: menor a mayor",
  precio_desc: "Precio: mayor a menor",
  superficie_desc: "Superficie: mayor a menor",
};

// Parámetro de la URL → campo del filtro. Todos son mínimos o máximos inclusivos.
export const PARAMS_NUMERICOS = {
  precio_min: "precioMin",
  precio_max: "precioMax",
  m2_min: "superficieMin",
  m2_max: "superficieMax",
  banos: "banosMin",
  estacionamientos: "estacionamientosMin",
  altura_min: "alturaLibreMin",
  andenes: "andenesMin",
  kva_min: "potenciaKvaMin",
} as const;

type CampoNumerico = (typeof PARAMS_NUMERICOS)[keyof typeof PARAMS_NUMERICOS];

export type FiltrosBusqueda = {
  modalidad?: (typeof MODALIDADES_BUSQUEDA)[number];
  tipo?: (typeof TIPOS_BUSQUEDA)[number];
  estado?: (typeof ESTADOS_BUSQUEDA)[number];
  ciudad?: string;
  financiamiento?: "true" | "false";
  // Moneda en la que se comparan los precios; los espacios en otra moneda no entran al filtro.
  moneda?: Moneda;
} & Partial<Record<CampoNumerico, number>>;

export interface LecturaBusqueda {
  filtros: FiltrosBusqueda;
  orden: OrdenBusqueda;
  // Parámetros presentes pero inválidos (la API responde 422; la página los ignora).
  invalidos: string[];
}

function enLista<T extends string>(valor: string, lista: readonly T[]): valor is T {
  return (lista as readonly string[]).includes(valor);
}

export function leerBusqueda(obtener: (clave: string) => string | undefined): LecturaBusqueda {
  const filtros: FiltrosBusqueda = {};
  const invalidos: string[] = [];
  const texto = (clave: string) => {
    const valor = obtener(clave)?.trim();
    return valor ? valor : undefined;
  };

  const enumerados = [
    ["modalidad", MODALIDADES_BUSQUEDA],
    ["tipo", TIPOS_BUSQUEDA],
    ["estado", ESTADOS_BUSQUEDA],
    ["financiamiento", ["true", "false"]],
    ["moneda", MONEDAS],
  ] as const;
  for (const [clave, lista] of enumerados) {
    const valor = texto(clave);
    if (valor === undefined) continue;
    if (enLista(valor, lista)) Object.assign(filtros, { [clave]: valor });
    else invalidos.push(clave);
  }

  const ciudad = texto("ciudad");
  if (ciudad) filtros.ciudad = ciudad;

  for (const [clave, campo] of Object.entries(PARAMS_NUMERICOS)) {
    const valor = texto(clave);
    if (valor === undefined) continue;
    const numero = Number(valor.replace(/,/g, ""));
    if (Number.isFinite(numero) && numero >= 0) filtros[campo] = numero;
    else invalidos.push(clave);
  }

  // Un rango de precio sin moneda se compara en pesos.
  if ((filtros.precioMin !== undefined || filtros.precioMax !== undefined) && !filtros.moneda) {
    filtros.moneda = "MXN";
  }

  const ordenTexto = texto("orden");
  let orden: OrdenBusqueda = "relevancia";
  if (ordenTexto !== undefined) {
    if (enLista(ordenTexto, ORDENES_BUSQUEDA)) orden = ordenTexto;
    else invalidos.push("orden");
  }

  return { filtros, orden, invalidos };
}

export function busquedaAParams(
  filtros: FiltrosBusqueda,
  orden: OrdenBusqueda = "relevancia",
): URLSearchParams {
  const params = new URLSearchParams();
  for (const clave of ["modalidad", "tipo", "estado", "ciudad", "financiamiento"] as const) {
    const valor = filtros[clave];
    if (valor) params.set(clave, valor);
  }
  for (const [clave, campo] of Object.entries(PARAMS_NUMERICOS)) {
    const valor = filtros[campo];
    if (valor !== undefined) params.set(clave, String(valor));
  }
  const hayPrecio = filtros.precioMin !== undefined || filtros.precioMax !== undefined;
  if (filtros.moneda && (hayPrecio || filtros.moneda !== "MXN")) {
    params.set("moneda", filtros.moneda);
  }
  if (orden !== "relevancia") params.set("orden", orden);
  return params;
}

// Cuántos filtros están activos (para el contador del botón "Filtros"). La moneda no cuenta por
// sí sola: solo acompaña al rango de precio.
export function contarFiltrosActivos(filtros: FiltrosBusqueda): number {
  let total = 0;
  for (const clave of ["modalidad", "tipo", "estado", "ciudad", "financiamiento"] as const) {
    if (filtros[clave]) total += 1;
  }
  if (filtros.precioMin !== undefined || filtros.precioMax !== undefined) total += 1;
  if (filtros.superficieMin !== undefined || filtros.superficieMax !== undefined) total += 1;
  for (const campo of [
    "banosMin",
    "estacionamientosMin",
    "alturaLibreMin",
    "andenesMin",
    "potenciaKvaMin",
  ] as const) {
    if (filtros[campo] !== undefined) total += 1;
  }
  return total;
}
