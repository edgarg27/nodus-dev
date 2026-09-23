import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireRol } from "../../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { listarBrokersActivos } from "../../../../../server/broker-requests/queries.ts";

function requestId(): string {
  return `req_${randomUUID()}`;
}

function errorEnvelope(code: string, message: string) {
  return { error: { code, message, request_id: requestId() } };
}

export async function GET() {
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

  const data = await listarBrokersActivos();
  return NextResponse.json({ data });
}
