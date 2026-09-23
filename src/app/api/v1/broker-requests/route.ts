import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import { crearSolicitudBroker } from "../../../../server/broker-requests/mutations.ts";

const brokerRequestSchema = z.object({
  mensaje: z.string().trim().min(1).max(500),
});

function requestId(): string {
  return `req_${randomUUID()}`;
}

function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: { code, message, ...(details ? { details } : {}), request_id: requestId() },
  };
}

export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = brokerRequestSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos", details), {
      status: 422,
    });
  }

  const resultado = await crearSolicitudBroker(actor, parsed.data.mensaje);
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.json(
    {
      data: {
        id: resultado.data.id,
        estado: resultado.data.estado,
        created_at: resultado.data.createdAt,
      },
    },
    { status: 201 },
  );
}
