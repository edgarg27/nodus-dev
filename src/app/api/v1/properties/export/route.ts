import { aCsv, respuestaCsv } from "../../../../../lib/csv.ts";
import { idiomaDeCookies, textosDe } from "../../../../../lib/i18n/index.ts";
import { leerMisPropiedades } from "../../../../../lib/mis-propiedades-params.ts";
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

  // Encabezados y etiquetas en el idioma del sitio (cookie `idioma`).
  const t = textosDe(idiomaDeCookies(request.headers.get("cookie")));
  const etiquetas = t.etiquetas as {
    tipo: Record<string, string>;
    modalidad: Record<string, string>;
  };
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
    t.csv.propiedades.encabezados,
    listado.filas.map((fila) => [
      fila.referencia,
      fila.titulo,
      etiquetas.tipo[fila.tipo] ?? fila.tipo,
      etiquetas.modalidad[fila.modalidad] ?? fila.modalidad,
      fila.direccion,
      fila.ciudad,
      fila.precio,
      fila.moneda,
      t.panel.estado[fila.estadoPublicacion] ?? fila.estadoPublicacion,
      fila.metricas.impresiones,
      fila.metricas.visitas,
      fila.metricas.solicitudes,
      fila.createdAt.toISOString().slice(0, 10),
    ]),
  );
  return respuestaCsv(t.csv.propiedades.archivo, csv);
}
