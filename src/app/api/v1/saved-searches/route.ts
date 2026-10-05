import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import {
  guardarBusqueda,
  listarBusquedasGuardadas,
} from "../../../../server/saved-searches/saved-searches.ts";

const guardarSchema = z.object({
  // La query string de /buscar, con o sin "?" inicial. Se normaliza en el servidor.
  consulta: z.string().max(2000),
  nombre: z.string().trim().max(120).optional(),
});

function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: { code, message, ...(details ? { details } : {}), request_id: `req_${randomUUID()}` },
  };
}

export async function GET() {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }
  return NextResponse.json({ data: await listarBusquedasGuardadas(actor.id) });
}

// Idempotente: guardar la misma búsqueda otra vez devuelve la existente (200 en lugar de 201).
export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const parsed = guardarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos", details), {
      status: 422,
    });
  }

  const resultado = await guardarBusqueda(actor, parsed.data);
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }
  return NextResponse.json(
    { data: resultado.data.busqueda },
    { status: resultado.data.creada ? 201 : 200 },
  );
}
