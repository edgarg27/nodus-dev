import { NextResponse } from "next/server";
import { z } from "zod";
import { ESTADOS_LEAD } from "../../../../../lib/leads.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { cambiarEstadoDeLead } from "../../../../../server/contact-requests/lead-status.ts";
import {
  errorValidacion,
  esUuid,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../server/http/envelope.ts";

const estadoSchema = z.object({ estado: z.enum(ESTADOS_LEAD) });

interface RouteParams {
  params: Promise<{ buscadorId: string }>;
}

// Cambia el estado del lead (la persona) en el embudo. Idempotente.
export async function PATCH(request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { buscadorId } = await params;
  if (!esUuid(buscadorId)) return noEncontrado("Lead no encontrado");

  const parsed = estadoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorValidacion(parsed.error);

  const resultado = await cambiarEstadoDeLead(actor, buscadorId, parsed.data.estado);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data });
}
