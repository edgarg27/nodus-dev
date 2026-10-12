import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { reenviarVerificacion } from "../../../../../server/verificacion/estado.ts";

function errorEnvelope(code: string, message: string) {
  return { error: { code, message, request_id: `req_${randomUUID()}` } };
}

// Sin cuerpo: vuelve a mandar a revisión la verificación denegada del oferente con sesión.
// Idempotente: con una solicitud ya pendiente responde 409 y no crea otra.
export async function POST() {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const resultado = await reenviarVerificacion(actor);
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.json({ data: { estado: "pendiente" } }, { status: 201 });
}
