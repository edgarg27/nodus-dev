// "Clientes y prospectos" del panel de administración: etapas del seguimiento de Captive, tipos de
// nota y parámetros de la lista.

export const ESTADOS_CLIENTE = ["pendiente", "seguimiento", "cerrado"] as const;
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[number];

export const TIPOS_NOTA = ["llamada_broker", "llamada_cliente", "nota"] as const;
export type TipoNota = (typeof TIPOS_NOTA)[number];

// "solicitudes": clientes que pidieron informes de algún espacio. "registrados": todos los
// buscadores registrados, aunque todavía no pidan nada.
export const VISTAS_CLIENTES = ["solicitudes", "registrados"] as const;
export type VistaClientes = (typeof VISTAS_CLIENTES)[number];

export const POR_PAGINA_CLIENTES = 25;
export const MAXIMO_NOTA = 2000;

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
