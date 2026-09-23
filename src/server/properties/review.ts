import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad } from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

export type DecisionRevision = { decision: "aprobar" } | { decision: "rechazar"; motivo: string };

export type PropiedadFila = typeof propiedad.$inferSelect;

export type ErrorRevision =
  | { code: "not_found"; status: 404; message: string }
  | { code: "conflict_already_reviewed"; status: 409; message: string }
  | { code: "validation_error"; status: 422; message: string };

export type ResultadoRevision =
  | { ok: true; data: PropiedadFila }
  | { ok: false; error: ErrorRevision };

function errorNotFound(): ResultadoRevision {
  return {
    ok: false,
    error: { code: "not_found", status: 404, message: "Propiedad no encontrada" },
  };
}

function errorYaRevisada(): ResultadoRevision {
  return {
    ok: false,
    error: {
      code: "conflict_already_reviewed",
      status: 409,
      message: "La propiedad ya fue revisada",
    },
  };
}

function errorMotivoRequerido(): ResultadoRevision {
  return {
    ok: false,
    error: { code: "validation_error", status: 422, message: "El motivo es obligatorio" },
  };
}

// `UPDATE … WHERE estado_publicacion = 'pendiente' AND activo RETURNING` es el candado: la
// segunda revisión (doble clic o dos admins) siempre recibe `conflict_already_reviewed` sin
// cambiar nada, sin importar quién ganó la carrera. El admin nunca edita contenido.
export async function revisarPropiedad(
  actor: ActorAutenticado | null,
  id: string,
  decision: DecisionRevision,
): Promise<ResultadoRevision> {
  const permiso = requireRol(actor, "admin");
  if (!permiso.ok || !actor) return errorNotFound();

  if (decision.decision === "rechazar" && decision.motivo.trim().length === 0) {
    return errorMotivoRequerido();
  }

  const [existente] = await db.select().from(propiedad).where(eq(propiedad.id, id));
  if (!existente?.activo) return errorNotFound();
  if (existente.estadoPublicacion !== "pendiente") return errorYaRevisada();

  const [fila] = await db
    .update(propiedad)
    .set(
      decision.decision === "aprobar"
        ? {
            estadoPublicacion: "publicada",
            motivoRechazo: null,
            revisadaPor: actor.id,
            revisadaEn: new Date(),
          }
        : {
            estadoPublicacion: "rechazada",
            motivoRechazo: decision.motivo.trim(),
            revisadaPor: actor.id,
            revisadaEn: new Date(),
          },
    )
    .where(
      and(
        eq(propiedad.id, id),
        eq(propiedad.estadoPublicacion, "pendiente"),
        eq(propiedad.activo, true),
      ),
    )
    .returning();

  // Carrera: otra revisión ganó entre el SELECT y el UPDATE.
  if (!fila) return errorYaRevisada();

  return { ok: true, data: fila };
}
