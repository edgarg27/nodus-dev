import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../../../../server/auth/session.ts";
import {
  errorValidacion,
  esUuid,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../../../server/http/envelope.ts";
import { manejarError } from "../../../../../../../server/http/handle-error.ts";
import { enviarMensajeComoCaptive } from "../../../../../../../server/messages/captive.ts";

const mensajeSchema = z.object({ texto: z.string().trim().min(1).max(2000) });

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Captive le escribe al cliente. No es idempotente: cada llamada agrega un mensaje.
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const actor = await getUsuarioActual();
    if (!actor) return sinSesion();
    if (actor.rol !== "admin" || !esUuid(id)) return noEncontrado();

    const parsed = mensajeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorValidacion(parsed.error);

    const resultado = await enviarMensajeComoCaptive(actor, id, parsed.data.texto);
    if (!resultado.ok) {
      return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
    }
    return NextResponse.json({ data: resultado.data }, { status: 201 });
  } catch (err) {
    return manejarError(err, request);
  }
}
