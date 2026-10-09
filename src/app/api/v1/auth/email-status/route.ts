import { NextResponse } from "next/server";
import { z } from "zod";
import { correoYaRegistrado } from "../../../../../server/auth/email-status.ts";
import { errorValidacion, limiteExcedido } from "../../../../../server/http/envelope.ts";
import { obtenerIpCliente, verificarLimite } from "../../../../../server/rate-limit/check.ts";

const cuerpoSchema = z.object({ email: z.email().max(254) });

// Máximo de consultas por minuto desde una misma IP. Esta ruta revela si un correo está registrado
// (a propósito: así el registro avisa antes de mandar un correo inútil), por eso lleva un límite
// que frena el sondeo masivo de correos.
const MAX_CONSULTAS_POR_MINUTO = 20;

// Solo lectura: el correo va en el cuerpo (no en la URL) y repetir la consulta no tiene efectos.
export async function POST(request: Request) {
  const parsed = cuerpoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorValidacion(parsed.error);

  const limite = await verificarLimite(`email-status:${obtenerIpCliente(request)}`, {
    max: MAX_CONSULTAS_POR_MINUTO,
  });
  if (!limite.ok) return limiteExcedido(limite.retryAfterSegundos ?? 60);

  const registrado = await correoYaRegistrado(parsed.data.email);
  return NextResponse.json({ data: { registrado } });
}
