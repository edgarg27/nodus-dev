// "Clientes y prospectos" del panel de administración: pasos del seguimiento de Captive a cada
// solicitud, etapa del cliente (se deriva de sus solicitudes), tipos de nota y parámetros de la lista.

// Pasos del seguimiento de Captive a una solicitud, siempre hacia adelante: nueva → con el broker
// (confirmando disponibilidad) → con el cliente (avisándole, agendando la visita) → cerrada. En
// cualquier momento se puede descartar.
export const PASOS_SOLICITUD = [
  "nueva",
  "con_broker",
  "con_cliente",
  "cerrada",
  "descartada",
] as const;
export type PasoSolicitud = (typeof PASOS_SOLICITUD)[number];

// Pasos en los que la solicitud ya no necesita nada más.
export const PASOS_TERMINADOS: readonly PasoSolicitud[] = ["cerrada", "descartada"];

export function pasoTerminado(paso: PasoSolicitud): boolean {
  return PASOS_TERMINADOS.includes(paso);
}

const SIGUIENTE: Partial<Record<PasoSolicitud, PasoSolicitud>> = {
  nueva: "con_broker",
  con_broker: "con_cliente",
  con_cliente: "cerrada",
};

// El paso al que lleva el botón "Pasar a…"; `null` si la solicitud ya terminó.
export function siguientePaso(paso: PasoSolicitud): PasoSolicitud | null {
  return SIGUIENTE[paso] ?? null;
}

// Etapa del cliente, calculada de sus solicitudes para Captive: "pendiente" si alguna sigue nueva,
// "cerrado" si todas terminaron, "seguimiento" en cualquier otro caso. Sin solicitudes para Captive
// (solo registrado, o solo solicitudes anteriores) no tiene etapa: `null`.
export const ESTADOS_CLIENTE = ["pendiente", "seguimiento", "cerrado"] as const;
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[number];

export function estadoDeCliente(pasos: PasoSolicitud[]): EstadoCliente | null {
  if (pasos.length === 0) return null;
  if (pasos.some((paso) => paso === "nueva")) return "pendiente";
  if (pasos.every(pasoTerminado)) return "cerrado";
  return "seguimiento";
}

// "paso" lo escribe el servidor al cambiar el paso de una solicitud; el formulario de notas solo
// ofrece los otros tres.
export const TIPOS_NOTA = ["llamada_broker", "llamada_cliente", "nota", "paso"] as const;
export type TipoNota = (typeof TIPOS_NOTA)[number];
export const TIPOS_NOTA_MANUAL = ["llamada_broker", "llamada_cliente", "nota"] as const;
export type TipoNotaManual = (typeof TIPOS_NOTA_MANUAL)[number];

// "solicitudes": clientes que pidieron informes de algún espacio. "registrados": todos los
// buscadores registrados, aunque todavía no pidan nada.
export const VISTAS_CLIENTES = ["solicitudes", "registrados"] as const;
export type VistaClientes = (typeof VISTAS_CLIENTES)[number];

export const POR_PAGINA_CLIENTES = 25;
export const MAXIMO_NOTA = 2000;
export const MAXIMO_RECORDATORIO = 300;

// "Hoy" para las próximas acciones se cuenta en la hora del centro de México.
export const ZONA_HORARIA = "America/Mexico_City";

// Fin del día (23:59:59.999) de `fecha` en la zona horaria de México, como instante UTC.
export function finDelDia(fecha: Date): Date {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  // Cuánto falta para la medianoche local, sumado al instante actual.
  const transcurrido =
    ((valor("hour") * 60 + valor("minute")) * 60 + valor("second")) * 1000 +
    fecha.getMilliseconds();
  return new Date(fecha.getTime() - transcurrido + 24 * 60 * 60 * 1000 - 1);
}

export interface ParamsClientes {
  q: string;
  vista: VistaClientes;
  estado: EstadoCliente | null;
  pagina: number;
}

export function leerParamsClientes(leer: (clave: string) => string | undefined): ParamsClientes {
  const vista = leer("vista");
  const estado = leer("estado");
  const pagina = Number(leer("pagina"));
  return {
    q: (leer("q") ?? "").trim().slice(0, 100),
    vista: (VISTAS_CLIENTES as readonly string[]).includes(vista ?? "")
      ? (vista as VistaClientes)
      : "solicitudes",
    estado: (ESTADOS_CLIENTE as readonly string[]).includes(estado ?? "")
      ? (estado as EstadoCliente)
      : null,
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
  };
}
