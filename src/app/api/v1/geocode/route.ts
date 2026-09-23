import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import { geocodificar } from "../../../../server/geocoding/client.ts";

const geocodeQuerySchema = z.object({
  q: z.string().trim().min(3),
});

function requestId(): string {
  return `req_${randomUUID()}`;
}

function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: { code, message, ...(details ? { details } : {}), request_id: requestId() },
  };
}

export async function GET(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const url = new URL(request.url);
  const parsed = geocodeQuerySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Consulta inválida", details), {
      status: 422,
    });
  }

  const resultado = await geocodificar(parsed.data.q);
  if (!resultado) {
    return NextResponse.json(errorEnvelope("not_found", "Sin resultados"), { status: 404 });
  }

  return NextResponse.json({
    data: {
      lat: resultado.lat,
      lng: resultado.lng,
      direccion_sugerida: resultado.direccionSugerida,
    },
  });
}
