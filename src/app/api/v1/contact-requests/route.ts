import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import { crearContactRequest } from "../../../../server/contact-requests/mutations.ts";
import { obtenerIpCliente, verificarLimite } from "../../../../server/rate-limit/check.ts";

const contactRequestSchema = z.object({
  propiedad_id: z.uuid(),
  quiere_financiamiento: z.boolean().optional().default(false),
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

  const limite = await verificarLimite(`contact:${obtenerIpCliente(request)}`, { max: 10 });
  if (!limite.ok) {
    return NextResponse.json(errorEnvelope("rate_limited", "Demasiadas solicitudes"), {
      status: 429,
      headers: { "Retry-After": String(limite.retryAfterSegundos) },
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = contactRequestSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos", details), {
      status: 422,
    });
  }

  const resultado = await crearContactRequest(actor, {
    propiedadId: parsed.data.propiedad_id,
    quiereFinanciamiento: parsed.data.quiere_financiamiento,
  });
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.json(
    {
      data: {
        id: resultado.data.id,
        telefono_oferente: resultado.data.telefonoOferente,
        whatsapp_url: resultado.data.whatsappUrl,
      },
    },
    { status: 201 },
  );
}
