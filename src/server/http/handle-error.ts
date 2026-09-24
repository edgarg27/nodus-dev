import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { log } from "../../lib/logger.ts";

// Mapea una excepción no controlada al envelope estándar de error y loguea la misma request_id.
// Alcance honesto en v1: ninguna ruta existente la invoca — sus errores de negocio ya son
// resultados tipados. Toda ruta NUEVA la usa en su `catch` (blueprint.md §20.4).
export function manejarError(err: unknown, request: Request): Response {
  const requestId = `req_${randomUUID()}`;

  log("error", "excepción no controlada", {
    requestId,
    method: request.method,
    url: request.url,
    error:
      err instanceof Error ? { name: err.name, message: err.message } : { message: String(err) },
  });

  return NextResponse.json(
    { error: { code: "internal_error", message: "Error inesperado", request_id: requestId } },
    { status: 500 },
  );
}
