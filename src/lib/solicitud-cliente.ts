import type { PasoSolicitud } from "./clientes.ts";

// Cómo ve el cliente el avance de una solicitud de informes. Traduce los pasos del seguimiento de
// Captive (src/lib/clientes.ts) a cuatro estados sencillos; "cerrada" y "descartada" se ven igual
// ("concluida"), sin decirle al cliente por qué se cerró. Las solicitudes anteriores al cambio de
// canal ("directo") llegaron al anunciante y Captive no les da seguimiento: "enviada".
export const ESTADOS_SOLICITUD_CLIENTE = [
  "recibida",
  "confirmando",
  "en_contacto",
  "concluida",
  "enviada",
] as const;
export type EstadoSolicitudCliente = (typeof ESTADOS_SOLICITUD_CLIENTE)[number];

export function estadoSolicitudCliente(
  canal: "directo" | "captive",
  paso: PasoSolicitud,
): EstadoSolicitudCliente {
  if (canal === "directo") return "enviada";
  if (paso === "con_broker") return "confirmando";
  if (paso === "con_cliente") return "en_contacto";
  if (paso === "cerrada" || paso === "descartada") return "concluida";
  return "recibida";
}

// Las que siguen en curso van primero en la pantalla de inicio.
export function solicitudEnCurso(estado: EstadoSolicitudCliente): boolean {
  return estado === "recibida" || estado === "confirmando" || estado === "en_contacto";
}
