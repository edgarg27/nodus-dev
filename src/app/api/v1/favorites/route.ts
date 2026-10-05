import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import { agregarFavorito, idsFavoritos } from "../../../../server/favorites/favorites.ts";

const agregarSchema = z.object({ propiedad_id: z.uuid() });

function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: { code, message, ...(details ? { details } : {}), request_id: `req_${randomUUID()}` },
  };
}

// Ids de los espacios favoritos del usuario.
export async function GET() {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }
  const ids = await idsFavoritos(actor.id);
  return NextResponse.json({ data: ids.map((id) => ({ propiedad_id: id })) });
}

// Idempotente: agregar un favorito que ya existe responde 200 igual.
export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const parsed = agregarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos", details), {
      status: 422,
    });
  }

  const resultado = await agregarFavorito(actor, parsed.data.propiedad_id);
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }
  return NextResponse.json({ data: { propiedad_id: parsed.data.propiedad_id, favorito: true } });
}
