import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { quitarFavorito } from "../../../../../server/favorites/favorites.ts";

function errorEnvelope(code: string, message: string) {
  return { error: { code, message, request_id: `req_${randomUUID()}` } };
}

interface RouteParams {
  params: Promise<{ propiedadId: string }>;
}

// Idempotente: quitar un favorito que no existe responde 200 igual.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const { propiedadId } = await params;
  if (!z.uuid().safeParse(propiedadId).success) {
    return NextResponse.json(errorEnvelope("not_found", "Propiedad no encontrada"), {
      status: 404,
    });
  }

  await quitarFavorito(actor, propiedadId);
  return NextResponse.json({ data: { propiedad_id: propiedadId, favorito: false } });
}
