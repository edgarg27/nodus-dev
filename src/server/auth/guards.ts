import type { ActorAutenticado } from "./session.ts";

export type Rol = "buscador" | "propietario" | "admin";

export type ResultadoRol =
  | { ok: true }
  | { ok: false; error: { code: "forbidden"; message: string } };

/**
 * Cada rol es exacto: `admin` no hereda los permisos de `propietario` ni de `buscador`.
 * Nunca lanza — un actor `null` o de otro rol es `{ ok: false }`.
 */
export function requireRol(actor: ActorAutenticado | null, rol: Rol): ResultadoRol {
  if (actor === null || actor.rol !== rol) {
    return { ok: false, error: { code: "forbidden", message: `Se requiere el rol ${rol}` } };
  }
  return { ok: true };
}
