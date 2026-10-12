import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../../../server/auth/session.ts";
import { urlDeDocumento } from "../../../../../../server/verificacion/documentos.ts";

const idSchema = z.uuid();

function errorEnvelope(code: string, message: string) {
  return { error: { code, message, request_id: `req_${randomUUID()}` } };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Abre un documento de verificación: redirige a una URL firmada que caduca en un minuto. Solo quien
// lo subió o un admin; a cualquier otro, 404.
export async function GET(_request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const id = idSchema.safeParse((await params).id);
  if (!id.success) {
    return NextResponse.json(errorEnvelope("not_found", "Documento no encontrado"), {
      status: 404,
    });
  }

  const resultado = await urlDeDocumento(actor, id.data);
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.redirect(resultado.data.url, {
    headers: { "Cache-Control": "no-store" },
  });
}
