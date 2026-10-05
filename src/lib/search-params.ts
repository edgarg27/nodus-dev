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

const TIPO_PLURAL: Record<string, string> = {
  nave_industrial: "Naves industriales",
  oficina: "Oficinas",
  local_comercial: "Locales comerciales",
};
const OPERACION: Record<string, string> = {
  renta: "en renta",
  venta: "en venta",
  desde_cero: "desde cero",
};
const ESTADO_NOMBRE: Record<string, string> = {
  SLP: "San Luis Potosí",
  Aguascalientes: "Aguascalientes",
  Leon: "León",
};

function cifra(valor: number): string {
  return valor.toLocaleString("es-MX", { maximumFractionDigits: 2 });
}

// Nombre automático de una búsqueda guardada: "Naves industriales en renta en San Luis Potosí ·
// hasta $40,000 MXN · desde 500 m²".
export function describirBusqueda(filtros: FiltrosBusqueda): string {
  const lugar = filtros.ciudad ?? (filtros.estado ? ESTADO_NOMBRE[filtros.estado] : undefined);
  const base = [
    filtros.tipo ? TIPO_PLURAL[filtros.tipo] : "Espacios",
    filtros.modalidad ? OPERACION[filtros.modalidad] : undefined,
    lugar ? `en ${lugar}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const extras: string[] = [];
  const moneda = filtros.moneda ?? "MXN";
  const prefijo = moneda === "USD" ? "USD " : "$";
  const sufijo = moneda === "USD" ? "" : " MXN";
  if (filtros.precioMin !== undefined && filtros.precioMax !== undefined) {
    extras.push(
      `${prefijo}${cifra(filtros.precioMin)} a ${prefijo}${cifra(filtros.precioMax)}${sufijo}`,
    );
  } else if (filtros.precioMax !== undefined) {
    extras.push(`hasta ${prefijo}${cifra(filtros.precioMax)}${sufijo}`);
  } else if (filtros.precioMin !== undefined) {
    extras.push(`desde ${prefijo}${cifra(filtros.precioMin)}${sufijo}`);
  }
  if (filtros.superficieMin !== undefined) extras.push(`desde ${cifra(filtros.superficieMin)} m²`);
  if (filtros.superficieMax !== undefined) extras.push(`hasta ${cifra(filtros.superficieMax)} m²`);
  if (filtros.andenesMin !== undefined) extras.push(`${filtros.andenesMin}+ andenes`);
  if (filtros.financiamiento === "true") extras.push("con financiamiento");

  return [base, ...extras].join(" · ").slice(0, 120);
}
