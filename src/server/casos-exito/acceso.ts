import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

// Acceso y resultados comunes de los casos de éxito: solo admin, y todo no-admin recibe 404 (regla
// de /api/v1/admin/**).

export type ErrorCaso =
  | { code: "not_found"; status: 404; message: string }
  // El lugar de la portada que se pidió ya lo ocupa otro caso.
  | { code: "conflict_position_taken"; status: 409; message: string };
export type ResultadoCaso<T> = { ok: true; data: T } | { ok: false; error: ErrorCaso };

export const NO_ENCONTRADO: ResultadoCaso<never> = {
  ok: false,
  error: { code: "not_found", status: 404, message: "No encontrado" },
};

export const LUGAR_OCUPADO: ResultadoCaso<never> = {
  ok: false,
  error: {
    code: "conflict_position_taken",
    status: 409,
    message: "Ese lugar de la portada ya está ocupado por otro caso",
  },
};

export function esAdmin(actor: ActorAutenticado | null): actor is ActorAutenticado {
  return requireRol(actor, "admin").ok && actor !== null;
}
