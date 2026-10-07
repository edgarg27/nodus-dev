import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import {
  errorValidacion,
  limiteExcedido,
  respuestaError,
  sinSesion,
} from "../../../../server/http/envelope.ts";
import {
  iniciarConversacion,
  listarConversaciones,
} from "../../../../server/messages/conversations.ts";
import { verificarLimite } from "../../../../server/rate-limit/check.ts";

const iniciarSchema = z.object({
  propiedad_id: z.uuid(),
  texto: z.string().trim().min(1).max(2000),
});

export async function GET() {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  const resultado = await listarConversaciones(actor);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data });
}

// Empieza (o retoma) la conversación sobre una propiedad de la Red y manda el primer mensaje. No es
// idempotente en el mensaje: cada llamada agrega uno, por eso lleva límite de frecuencia.
export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();

  const parsed = iniciarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorValidacion(parsed.error);

  const limite = await verificarLimite(`mensaje:${actor.id}`, { max: 30 });
  if (!limite.ok) return limiteExcedido(limite.retryAfterSegundos ?? 60);

  const resultado = await iniciarConversacion(actor, parsed.data.propiedad_id, parsed.data.texto);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json(
    { data: { conversacion_id: resultado.data.conversacionId } },
    { status: 201 },
  );
}
