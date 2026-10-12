import { NextResponse } from "next/server";
import { casoEdicionSchema } from "../../../../../../lib/casos-exito.ts";
import { getUsuarioActual } from "../../../../../../server/auth/session.ts";
import { borrarCaso, editarCaso } from "../../../../../../server/casos-exito/mutations.ts";
import {
  errorValidacion,
  esUuid,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../../server/http/envelope.ts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Cambia solo los campos que se mandan. Idempotente.
export async function PATCH(request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { id } = await params;
  if (!esUuid(id)) return noEncontrado();

  const parsed = casoEdicionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorValidacion(parsed.error);

  const resultado = await editarCaso(actor, id, parsed.data);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data });
}

// Borra el caso y su foto. Un caso que ya no existe responde 404.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { id } = await params;
  if (!esUuid(id)) return noEncontrado();

  const resultado = await borrarCaso(actor, id);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data });
}
