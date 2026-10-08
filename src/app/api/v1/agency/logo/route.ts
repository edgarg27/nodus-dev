import { NextResponse } from "next/server";
import { quitarLogoAgencia, subirLogoAgencia } from "../../../../../server/agency/logo.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { respuestaError, sinSesion } from "../../../../../server/http/envelope.ts";

// Sube (o reemplaza) el logo de la agencia: multipart con el campo `archivo`.
export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();

  const formData = await request.formData().catch(() => null);
  const archivo = formData?.get("archivo");
  if (!(archivo instanceof File)) {
    return respuestaError(422, "validation_error", "Falta el archivo");
  }

  const resultado = await subirLogoAgencia(actor, {
    buffer: Buffer.from(await archivo.arrayBuffer()),
    contentType: archivo.type,
  });
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: { logo_url: resultado.data.logoUrl } }, { status: 201 });
}

// Quita el logo. Idempotente: sin logo deja todo igual.
export async function DELETE() {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();

  const resultado = await quitarLogoAgencia(actor);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: { logo_url: null } });
}
