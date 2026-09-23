import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRol } from "../../../../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../../../../server/auth/session.ts";
import { revocarBroker } from "../../../../../../../server/broker-requests/revoke.ts";

const revokeSchema = z.object({
  motivo: z.string().trim().min(1).max(500),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esUuid(valor: string): boolean {
  return UUID_REGEX.test(valor);
}

function requestId(): string {
  return `req_${randomUUID()}`;
}

function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: { code, message, ...(details ? { details } : {}), request_id: requestId() },
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const permiso = requireRol(actor, "admin");
  if (!permiso.ok) {
    return NextResponse.json(errorEnvelope("not_found", "No encontrado"), { status: 404 });
  }

  if (!esUuid(id)) {
    return NextResponse.json(errorEnvelope("not_found", "Usuario no encontrado"), {
      status: 404,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos", details), {
      status: 422,
    });
  }

  const resultado = await revocarBroker(actor, id, parsed.data.motivo);
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.json({
    data: {
      id: resultado.data.id,
      is_broker: resultado.data.isBroker,
      revocada_en: resultado.data.revocadaEn,
    },
  });
}
