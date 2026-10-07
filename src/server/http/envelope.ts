import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

// Envelope de error estándar para las rutas nuevas: `{ error: { code, message, details?, request_id } }`.
export function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: { code, message, ...(details ? { details } : {}), request_id: `req_${randomUUID()}` },
  };
}

export function respuestaError(status: number, code: string, message: string, details?: unknown[]) {
  return NextResponse.json(errorEnvelope(code, message, details), { status });
}

export function sinSesion() {
  return respuestaError(401, "unauthenticated", "Sesión requerida");
}

export function errorValidacion(error: ZodError) {
  const details = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
  return respuestaError(422, "validation_error", "Datos inválidos", details);
}

export function noEncontrado(mensaje = "No encontrado") {
  return respuestaError(404, "not_found", mensaje);
}

export function limiteExcedido(retryAfterSegundos: number) {
  return NextResponse.json(errorEnvelope("rate_limited", "Demasiadas solicitudes"), {
    status: 429,
    headers: { "Retry-After": String(retryAfterSegundos) },
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: string): boolean {
  return UUID_REGEX.test(valor);
}
