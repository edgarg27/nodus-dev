import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRol } from "../../../../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../../../../server/auth/session.ts";
import { aprobarSolicitudRevisada } from "../../../../../../../server/verificacion/aprobar.ts";

// `nota`: por qué se aprueba aunque falten documentos de verificación (obligatoria solo entonces).
const approveSchema = z.object({
  nota: z.string().trim().max(500).optional(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esUuid(valor: string): boolean {
  return UUID_REGEX.test(valor);
}

function requestId(): string {
  return `req_${randomUUID()}`;
}

function errorEnvelope(code: string, message: string) {
  return { error: { code, message, request_id: requestId() } };
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
    return NextResponse.json(errorEnvelope("not_found", "Solicitud no encontrada"), {
      status: 404,
    });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = approveSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos"), {
      status: 422,
    });
  }

  const resultado = await aprobarSolicitudRevisada(actor, id, parsed.data.nota);
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.json({
    data: {
      id: resultado.data.id,
      estado: resultado.data.estado,
      tipo: resultado.data.tipo,
      // null en una solicitud de dueño.
      broker_code: resultado.data.brokerCode,
      resuelta_en: resultado.data.resueltaEn,
    },
  });
}
