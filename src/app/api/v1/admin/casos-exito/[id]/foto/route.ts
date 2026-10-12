import { NextResponse } from "next/server";
import { getUsuarioActual } from "../../../../../../../server/auth/session.ts";
import { quitarFotoDeCaso, subirFotoDeCaso } from "../../../../../../../server/casos-exito/foto.ts";
import {
  esUuid,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../../../server/http/envelope.ts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Sube (o reemplaza) la foto del caso: multipart con el campo `archivo`.
export async function POST(request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { id } = await params;
  if (!esUuid(id)) return noEncontrado();

  const formData = await request.formData().catch(() => null);
  const archivo = formData?.get("archivo");
  if (!(archivo instanceof File)) {
    return respuestaError(422, "validation_error", "Falta el archivo");
  }

  const resultado = await subirFotoDeCaso(actor, id, {
    buffer: Buffer.from(await archivo.arrayBuffer()),
    contentType: archivo.type,
  });
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: { foto_url: resultado.data.fotoUrl } }, { status: 201 });
}

// Quita la foto. Idempotente: sin foto deja todo igual.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { id } = await params;
  if (!esUuid(id)) return noEncontrado();

  const resultado = await quitarFotoDeCaso(actor, id);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: { foto_url: null } });
}
