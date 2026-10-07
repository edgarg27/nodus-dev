// Embudo de seguimiento de leads y parámetros de la bandeja de entrada del oferente.

export const ESTADOS_LEAD = [
  "nueva",
  "contactada",
  "visita",
  "propuesta",
  "ganada",
  "descartada",
] as const;
export type EstadoLead = (typeof ESTADOS_LEAD)[number];

export const POR_PAGINA_LEADS = 25;

export interface ParamsBandeja {
  q: string;
  estado: EstadoLead | null;
  pagina: number;
}

export function leerBandeja(leer: (clave: string) => string | undefined): ParamsBandeja {
  const estado = leer("estado");
  const pagina = Number(leer("pagina"));
  return {
    q: (leer("q") ?? "").trim().slice(0, 100),
    estado: (ESTADOS_LEAD as readonly string[]).includes(estado ?? "")
      ? (estado as EstadoLead)
      : null,
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
  };
}

export function bandejaAParams(params: ParamsBandeja): URLSearchParams {
  const salida = new URLSearchParams();
  if (params.q) salida.set("q", params.q);
  if (params.estado) salida.set("estado", params.estado);
  if (params.pagina > 1) salida.set("pagina", String(params.pagina));
  return salida;
}
