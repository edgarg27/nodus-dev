import { NextResponse } from "next/server";
import { z } from "zod";
import { ESTADOS_CLIENTE } from "../../../../../../lib/clientes.ts";
import { getUsuarioActual } from "../../../../../../server/auth/session.ts";
import { cambiarEstadoCliente } from "../../../../../../server/clientes/mutations.ts";
import {
  errorValidacion,
  esUuid,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../../server/http/envelope.ts";
import { manejarError } from "../../../../../../server/http/handle-error.ts";

const estadoSchema = z.object({ estado: z.enum(ESTADOS_CLIENTE) });

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Cambia la etapa del seguimiento de Captive a un cliente. Idempotente.
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const actor = await getUsuarioActual();
    if (!actor) return sinSesion();
    if (actor.rol !== "admin" || !esUuid(id)) return noEncontrado();

    const parsed = estadoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorValidacion(parsed.error);

    const resultado = await cambiarEstadoCliente(actor, id, parsed.data.estado);
    if (!resultado.ok) {
      return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
    }
    return NextResponse.json({ data: resultado.data });
  } catch (err) {
    return manejarError(err, request);
  }
}
