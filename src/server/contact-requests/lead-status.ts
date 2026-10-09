import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { contactRequest } from "../../lib/db/schema.ts";
import type { EstadoLead } from "../../lib/leads.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

export type ResultadoEstadoLead =
  | { ok: true; data: { buscadorId: string; estado: EstadoLead; actualizadas: number } }
  | { ok: false; error: { code: "forbidden" | "not_found"; status: 403 | 404; message: string } };

// Cambia el estado de todas las solicitudes de un buscador a este oferente. Idempotente: repetir
// el mismo estado deja el mismo resultado. Un buscador que no le escribió a este oferente → 404.
export async function cambiarEstadoDeLead(
  actor: ActorAutenticado | null,
  buscadorId: string,
  estado: EstadoLead,
): Promise<ResultadoEstadoLead> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) {
    return {
      ok: false,
      error: { code: "forbidden", status: 403, message: "Se requiere el rol oferente" },
    };
  }
  const actualizadas = await db
    .update(contactRequest)
    .set({ estado })
    .where(
      and(
        eq(contactRequest.oferenteId, actor.id),
        eq(contactRequest.buscadorId, buscadorId),
        eq(contactRequest.canal, "directo"),
      ),
    )
    .returning({ id: contactRequest.id });
  if (actualizadas.length === 0) {
    return { ok: false, error: { code: "not_found", status: 404, message: "Lead no encontrado" } };
  }
  return { ok: true, data: { buscadorId, estado, actualizadas: actualizadas.length } };
}
