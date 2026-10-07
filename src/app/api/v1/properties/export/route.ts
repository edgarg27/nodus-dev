import { aCsv, respuestaCsv } from "../../../../../lib/csv.ts";
import { leerMisPropiedades } from "../../../../../lib/mis-propiedades-params.ts";
import { ETIQUETA_MODALIDAD, ETIQUETA_TIPO } from "../../../../../lib/property-details.ts";
import { requireRol } from "../../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { esUuid, respuestaError, sinSesion } from "../../../../../server/http/envelope.ts";
import { listarMisPropiedades } from "../../../../../server/properties/queries.ts";

// CSV con las propiedades del oferente y sus métricas, respetando la búsqueda y el estado de la
// tabla. Solo lectura: no tiene efectos, así que repetirlo es seguro.
export async function GET(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  if (!requireRol(actor, "oferente").ok || !actor) {
    return respuestaError(403, "forbidden", "Se requiere el rol oferente");
  }

  const url = new URL(request.url);
  const params = leerMisPropiedades((clave) => url.searchParams.get(clave) ?? undefined);
  // `ids` limita el CSV a la selección de la tabla; los que no son uuid se descartan.
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(esUuid);
  const listado = await listarMisPropiedades(actor.id, {
    ...(url.searchParams.has("ids") ? { ids } : {}),
    q: params.q,
    estadoPublicacion: params.estado === "todas" ? undefined : params.estado,
    orden: params.orden,
    porPagina: null,
  });

  const csv = aCsv(
    [
      "Referencia",
      "Título",
      "Tipo",
      "Operación",
      "Dirección",
      "Ciudad",
      "Precio",
      "Moneda",
      "Publicación",
      "Impresiones",
      "Visitas",
      "Solicitudes",
      "Alta",
    ],
    listado.filas.map((fila) => [
      fila.referencia,
      fila.titulo,
      ETIQUETA_TIPO[fila.tipo] ?? fila.tipo,
      ETIQUETA_MODALIDAD[fila.modalidad] ?? fila.modalidad,
      fila.direccion,
      fila.ciudad,
      fila.precio,
      fila.moneda,
      fila.estadoPublicacion,
      fila.metricas.impresiones,
      fila.metricas.visitas,
      fila.metricas.solicitudes,
      fila.createdAt.toISOString().slice(0, 10),
    ]),
  );
  return respuestaCsv("propiedades.csv", csv);
}
