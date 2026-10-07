// Parámetros de la tabla "Mis propiedades" (búsqueda, estado, orden y página). Los comparten la
// página, la API de exportación y la tabla, para que una URL signifique lo mismo en los tres.

export const POR_PAGINA_MIS_PROPIEDADES = 25;

export const CAMPOS_ORDEN_MIS_PROPIEDADES = [
  "fecha",
  "precio",
  "impresiones",
  "visitas",
  "solicitudes",
] as const;
export type CampoOrdenMisPropiedades = (typeof CAMPOS_ORDEN_MIS_PROPIEDADES)[number];
export type DireccionOrden = "asc" | "desc";
export type OrdenMisPropiedades = `${CampoOrdenMisPropiedades}_${DireccionOrden}`;

export const ESTADOS_FILTRO = ["todas", "pendiente", "publicada", "rechazada"] as const;
export type FiltroEstadoMisPropiedades = (typeof ESTADOS_FILTRO)[number];

export interface ParamsMisPropiedades {
  q: string;
  estado: FiltroEstadoMisPropiedades;
  orden: OrdenMisPropiedades;
  pagina: number;
}

export const PARAMS_MIS_PROPIEDADES_POR_DEFECTO: ParamsMisPropiedades = {
  q: "",
  estado: "todas",
  orden: "fecha_desc",
  pagina: 1,
};

export function dividirOrden(orden: OrdenMisPropiedades): {
  campo: CampoOrdenMisPropiedades;
  direccion: DireccionOrden;
} {
  const [campo, direccion] = orden.split("_") as [CampoOrdenMisPropiedades, DireccionOrden];
  return { campo, direccion };
}

// Un valor inválido en la URL se ignora y se usa el de por defecto (como en /buscar).
export function leerMisPropiedades(
  leer: (clave: string) => string | undefined,
): ParamsMisPropiedades {
  const valores = PARAMS_MIS_PROPIEDADES_POR_DEFECTO;
  const estado = leer("estado");
  const orden = leer("orden");
  const pagina = Number(leer("pagina"));
  const ordenValido = CAMPOS_ORDEN_MIS_PROPIEDADES.some(
    (campo) => orden === `${campo}_asc` || orden === `${campo}_desc`,
  );
  return {
    q: (leer("q") ?? "").trim().slice(0, 100),
    estado: (ESTADOS_FILTRO as readonly string[]).includes(estado ?? "")
      ? (estado as FiltroEstadoMisPropiedades)
      : valores.estado,
    orden: ordenValido ? (orden as OrdenMisPropiedades) : valores.orden,
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : valores.pagina,
  };
}

// Solo escribe lo que difiere del valor por defecto, para URLs cortas.
export function misPropiedadesAParams(params: ParamsMisPropiedades): URLSearchParams {
  const salida = new URLSearchParams();
  const valores = PARAMS_MIS_PROPIEDADES_POR_DEFECTO;
  if (params.q) salida.set("q", params.q);
  if (params.estado !== valores.estado) salida.set("estado", params.estado);
  if (params.orden !== valores.orden) salida.set("orden", params.orden);
  if (params.pagina !== valores.pagina) salida.set("pagina", String(params.pagina));
  return salida;
}
