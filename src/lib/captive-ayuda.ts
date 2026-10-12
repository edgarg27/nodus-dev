import { busquedaAParams, type FiltrosBusqueda } from "./search-params.ts";

// "¿No encontraste tu espacio?": lleva al chat con Captive con la búsqueda como borrador. La
// consulta son solo filtros (tipo, lugar, precio…), nunca datos personales, así que puede ir en la
// URL. Quien no tiene sesión pasa primero por iniciar sesión y regresa al chat.
export function hrefAyudaCaptive(autenticado: boolean, filtros: FiltrosBusqueda): string {
  const consulta = busquedaAParams(filtros).toString();
  const chat = `/mensajes/captive${consulta ? `?busqueda=${encodeURIComponent(consulta)}` : "?ayuda=1"}`;
  return autenticado ? chat : `/sign-in?next=${encodeURIComponent(chat)}`;
}
