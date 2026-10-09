import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import {
  errorValidacion,
  limiteExcedido,
  respuestaError,
  sinSesion,
} from "../../../../server/http/envelope.ts";
import { manejarError } from "../../../../server/http/handle-error.ts";
import {
  enviarMensajeACaptive,
  obtenerChatDelCliente,
} from "../../../../server/messages/captive.ts";
import { verificarLimite } from "../../../../server/rate-limit/check.ts";

const mensajeSchema = z.object({ texto: z.string().trim().min(1).max(2000) });

// Chat del cliente con el equipo de Captive. Abrirlo marca como leídos los mensajes de Captive.
export async function GET(request: Request) {
  try {
    const actor = await getUsuarioActual();
    if (!actor) return sinSesion();
    const resultado = await obtenerChatDelCliente(actor);
    if (!resultado.ok) {
      return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
    }
    return NextResponse.json({ data: resultado.data });
  } catch (err) {
    return manejarError(err, request);
  }
}

// No es idempotente: cada llamada agrega un mensaje (con límite de frecuencia).
export async function POST(request: Request) {
  try {
    const actor = await getUsuarioActual();
    if (!actor) return sinSesion();

    const parsed = mensajeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorValidacion(parsed.error);

    const limite = await verificarLimite(`mensaje:${actor.id}`, { max: 30 });
    if (!limite.ok) return limiteExcedido(limite.retryAfterSegundos ?? 60);

    const resultado = await enviarMensajeACaptive(actor, parsed.data.texto);
    if (!resultado.ok) {
      return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
    }
    return NextResponse.json({ data: resultado.data }, { status: 201 });
  } catch (err) {
    return manejarError(err, request);
  }
}
