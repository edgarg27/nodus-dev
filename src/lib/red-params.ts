import {
  busquedaAParams,
  type FiltrosBusqueda,
  leerBusqueda,
  type OrdenBusqueda,
} from "./search-params.ts";

// Parámetros de la Red inmobiliaria: los filtros de /buscar más "exclusiva", "ocultar mis
// propiedades" y la página. Los comparten la página /red, la API y el botón "Ver más".

export const POR_PAGINA_RED = 24;

export interface ParamsRed {
  filtros: FiltrosBusqueda;
  orden: OrdenBusqueda;
  exclusiva: boolean;
  ocultarPropias: boolean;
  pagina: number;
  invalidos: string[];
}

export function leerRed(leer: (clave: string) => string | undefined): ParamsRed {
  const { filtros, orden, invalidos } = leerBusqueda(leer);
  const pagina = Number(leer("pagina"));
  return {
    filtros,
    // "relevancia" en la Red es el orden por más recientes.
    orden: orden === "relevancia" ? "recientes" : orden,
    exclusiva: leer("exclusiva") === "1",
    ocultarPropias: leer("ocultar_propias") === "1",
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
    invalidos,
  };
}

export function redAParams(params: Omit<ParamsRed, "invalidos">): URLSearchParams {
  const salida = busquedaAParams(params.filtros, params.orden);
  if (params.orden === "recientes") salida.delete("orden");
  if (params.exclusiva) salida.set("exclusiva", "1");
  if (params.ocultarPropias) salida.set("ocultar_propias", "1");
  if (params.pagina > 1) salida.set("pagina", String(params.pagina));
  return salida;
}
