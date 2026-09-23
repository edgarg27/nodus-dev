import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireRol } from "../../../../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../../../../server/auth/session.ts";
import { aprobarSolicitud } from "../../../../../../../server/broker-requests/resolve.ts";

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

export async function POST(_request: Request, { params }: RouteParams) {
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

  const resultado = await aprobarSolicitud(actor, id);
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.json({
    data: {
      id: resultado.data.id,
      estado: resultado.data.estado,
      broker_code: resultado.data.brokerCode,
      resuelta_en: resultado.data.resueltaEn,
    },
  });
}
