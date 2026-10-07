import { NextResponse } from "next/server";
import { borrarContactoDeAgencia } from "../../../../../../server/agency/mutations.ts";
import { getUsuarioActual } from "../../../../../../server/auth/session.ts";
import {
  esUuid,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../../server/http/envelope.ts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Idempotente en el resultado final: un contacto ya borrado responde 404.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { id } = await params;
  if (!esUuid(id)) return noEncontrado("Contacto no encontrado");

  const resultado = await borrarContactoDeAgencia(actor, id);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data });
}
