import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import {
  errorValidacion,
  esUuid,
  limiteExcedido,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../server/http/envelope.ts";
import {
  enviarMensaje,
  obtenerConversacion,
} from "../../../../../server/messages/conversations.ts";
import { verificarLimite } from "../../../../../server/rate-limit/check.ts";

const mensajeSchema = z.object({ texto: z.string().trim().min(1).max(2000) });

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Los mensajes de la conversación. Abrirla marca como leídos los del otro participante.
export async function GET(_request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { id } = await params;
  if (!esUuid(id)) return noEncontrado("Conversación no encontrada");

  const resultado = await obtenerConversacion(actor, id);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data });
}

// No es idempotente: cada llamada agrega un mensaje (con límite de frecuencia).
export async function POST(request: Request, { params }: RouteParams) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const { id } = await params;
  if (!esUuid(id)) return noEncontrado("Conversación no encontrada");

  const parsed = mensajeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorValidacion(parsed.error);

  const limite = await verificarLimite(`mensaje:${actor.id}`, { max: 30 });
  if (!limite.ok) return limiteExcedido(limite.retryAfterSegundos ?? 60);

  const resultado = await enviarMensaje(actor, id, parsed.data.texto);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data }, { status: 201 });
}
