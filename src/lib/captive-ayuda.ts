import { env } from "./env.ts";
import { type Idioma, textosDe } from "./i18n/index.ts";
import {
  busquedaAParams,
  contarFiltrosActivos,
  describirBusqueda,
  type FiltrosBusqueda,
} from "./search-params.ts";

// "¿No encontraste tu espacio?": lleva al WhatsApp de Captive con un mensaje ya escrito (la búsqueda,
// si la hay). No pide sesión. La consulta son solo filtros (tipo, lugar, precio…), nunca datos
// personales, así que puede ir en la URL.
//
// Sin `NEXT_PUBLIC_CAPTIVE_WHATSAPP` configurado se conserva el camino anterior: el chat con Captive
// de la web con la búsqueda como borrador (quien no tiene sesión pasa primero por iniciar sesión).
export function hrefAyudaCaptive(
  autenticado: boolean,
  filtros: FiltrosBusqueda,
  idioma: Idioma,
): string {
  const whatsapp = numeroWhatsapp(env.NEXT_PUBLIC_CAPTIVE_WHATSAPP);
  if (whatsapp) {
    const m = textosDe(idioma).panel.mensajes;
    const mensaje =
      contarFiltrosActivos(filtros) > 0
        ? m.borradorBusqueda(describirBusqueda(filtros))
        : m.borradorAyuda;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;
  }

  const consulta = busquedaAParams(filtros).toString();
  const chat = `/mensajes/captive${consulta ? `?busqueda=${encodeURIComponent(consulta)}` : "?ayuda=1"}`;
  return autenticado ? chat : `/sign-in?next=${encodeURIComponent(chat)}`;
}

// wa.me exige la lada del país. Un número de 10 dígitos es un celular de México sin ella: se le
// antepone el 52.
function numeroWhatsapp(valor: string | undefined): string {
  const digitos = valor?.replace(/\D/g, "") ?? "";
  return digitos.length === 10 ? `52${digitos}` : digitos;
}

// El enlace de ayuda sale del sitio (WhatsApp) o es el chat de la web.
export function esEnlaceWhatsapp(href: string): boolean {
  return href.startsWith("https://wa.me/");
}
