import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import {
  eliminarBusqueda,
  marcarBusquedaVista,
} from "../../../../../server/saved-searches/saved-searches.ts";

const actualizarSchema = z.object({ vista: z.literal(true) });

function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: { code, message, ...(details ? { details } : {}), request_id: `req_${randomUUID()}` },
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

function noEncontrada() {
  return NextResponse.json(errorEnvelope("not_found", "Búsqueda no encontrada"), { status: 404 });
}

function sinSesion() {
  return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), { status: 401 });
}

// { "vista": true } reinicia el contador de espacios nuevos (se llama al abrir la búsqueda).
export async function PATCH(request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return noEncontrada();

  const parsed = actualizarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos", details), {
      status: 422,
    });
  }

  const resultado = await marcarBusquedaVista(actor, id);
  if (!resultado.ok) return noEncontrada();
  return NextResponse.json({ data: resultado.data });
}

// Una búsqueda de otro usuario responde 404 (no confirma que exista).
export async function DELETE(_request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return noEncontrada();

  const resultado = await eliminarBusqueda(actor, id);
  if (!resultado.ok) return noEncontrada();
  return NextResponse.json({ data: { id } });
}
