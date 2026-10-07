import { NextResponse } from "next/server";
import { leerRed } from "../../../../lib/red-params.ts";
import { requireRol } from "../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import { respuestaError, sinSesion } from "../../../../server/http/envelope.ts";
import { listarPropiedadesDeLaRed } from "../../../../server/network/queries.ts";

// Directorio de la Red inmobiliaria: solo oferentes. Los filtros son los de /buscar más
// `exclusiva=1`, `ocultar_propias=1` y `pagina`. Solo lectura.
export async function GET(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  if (!requireRol(actor, "oferente").ok) {
    return respuestaError(403, "forbidden", "Se requiere el rol oferente");
  }

  const url = new URL(request.url);
  const params = leerRed((clave) => url.searchParams.get(clave) ?? undefined);
  if (params.invalidos.length > 0) {
    return respuestaError(
      422,
      "validation_error",
      "Filtros inválidos",
      params.invalidos.map((field) => ({ field, message: "Valor inválido" })),
    );
  }

  const { financiamiento, ...filtros } = params.filtros;
  const listado = await listarPropiedadesDeLaRed(
    {
      ...filtros,
      aceptaFinanciamiento: financiamiento === undefined ? undefined : financiamiento === "true",
      exclusiva: params.exclusiva || undefined,
      excluirOferenteId: params.ocultarPropias ? actor.id : undefined,
    },
    { orden: params.orden, pagina: params.pagina },
  );
  return NextResponse.json({
    data: listado.filas,
    meta: { total: listado.total, page: listado.pagina, per_page: listado.porPagina },
  });
}
