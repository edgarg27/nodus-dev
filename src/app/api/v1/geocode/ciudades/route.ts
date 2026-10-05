import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buscarCiudades } from "../../../../../server/geocoding/client.ts";
import { obtenerIpCliente, verificarLimite } from "../../../../../server/rate-limit/check.ts";

const ciudadesQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      request_id: `req_${randomUUID()}`,
    },
  };
}

// Público a propósito: lo consume el buscador de la portada, que se ve sin sesión. El límite por
// IP es lo único que protege la cuota de MapTiler; la llave nunca sale en la respuesta.
export async function GET(request: Request) {
  const limite = await verificarLimite(`ciudades:${obtenerIpCliente(request)}`, { max: 60 });
  if (!limite.ok) {
    return NextResponse.json(errorEnvelope("rate_limited", "Demasiadas solicitudes"), {
      status: 429,
      headers: { "Retry-After": String(limite.retryAfterSegundos) },
    });
  }

  const url = new URL(request.url);
  const parsed = ciudadesQuerySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Consulta inválida", details), {
      status: 422,
    });
  }

  try {
    const ciudades = await buscarCiudades(parsed.data.q);
    return NextResponse.json({ data: { ciudades } });
  } catch {
    return NextResponse.json(errorEnvelope("upstream_error", "No se pudo consultar el mapa"), {
      status: 502,
    });
  }
}
