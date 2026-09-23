import { eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import {
  brokerAtribucionHistorica,
  brokerRevocacion,
  contactRequest,
  usuario,
} from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

export type UsuarioFila = typeof usuario.$inferSelect;

export type ErrorRevocacion =
  | { code: "not_found"; status: 404; message: string }
  | { code: "conflict_not_broker"; status: 409; message: string }
  | { code: "validation_error"; status: 422; message: string };

export type ResultadoRevocacion =
  | { ok: true; data: UsuarioFila & { revocadaEn: Date } }
  | { ok: false; error: ErrorRevocacion };

function errorNotFound(): ResultadoRevocacion {
  return {
    ok: false,
    error: { code: "not_found", status: 404, message: "Usuario no encontrado" },
  };
}

function errorNoBroker(): ResultadoRevocacion {
  return {
    ok: false,
    error: { code: "conflict_not_broker", status: 409, message: "Este usuario no es broker" },
  };
}

function errorMotivoRequerido(): ResultadoRevocacion {
  return {
    ok: false,
    error: { code: "validation_error", status: 422, message: "El motivo es obligatorio" },
  };
}

// Revocar exige un motivo auditable y corre en una sola transacción: (1) lee la fila `usuario`
// con FOR UPDATE; (2) lee los ids de `contact_request` atribuidos a este broker ANTES de tocar
// nada — es la fotografía; (3) apaga is_broker y limpia broker_code; (4) inserta la auditoría en
// broker_revocacion; (5) inserta la fotografía inmutable en broker_atribucion_historica. Nunca
// toca `contact_request` ni `propiedad` ni `broker_solicitud`.
export async function revocarBroker(
  actor: ActorAutenticado | null,
  usuarioId: string,
  motivo: string,
): Promise<ResultadoRevocacion> {
  const permiso = requireRol(actor, "admin");
  if (!permiso.ok || !actor) return errorNotFound();

  const motivoRecortado = motivo.trim();
  if (motivoRecortado.length === 0) return errorMotivoRequerido();

  return db.transaction(async (tx) => {
    const [fila] = await tx.select().from(usuario).where(eq(usuario.id, usuarioId)).for("update");
    if (!fila) return errorNotFound();
    if (!fila.isBroker) return errorNoBroker();

    const leads = await tx
      .select({ id: contactRequest.id })
      .from(contactRequest)
      .where(eq(contactRequest.brokerId, usuarioId));
    const leadIds = leads.map((lead) => lead.id);

    const [actualizado] = await tx
      .update(usuario)
      .set({ isBroker: false, brokerCode: null })
      .where(eq(usuario.id, usuarioId))
      .returning();
    if (!actualizado) throw new Error("update de usuario no devolvió fila");

    const [revocacion] = await tx
      .insert(brokerRevocacion)
      .values({
        usuarioId,
        brokerCode: fila.brokerCode as string,
        motivo: motivoRecortado.slice(0, 500),
        revocadaPor: actor.id,
      })
      .returning();
    if (!revocacion) throw new Error("insert de broker_revocacion no devolvió fila");

    await tx.insert(brokerAtribucionHistorica).values({
      brokerRevocacionId: revocacion.id,
      usuarioId,
      brokerCode: fila.brokerCode as string,
      contactRequestIds: leadIds,
      totalLeads: leadIds.length,
    });

    return { ok: true, data: { ...actualizado, revocadaEn: revocacion.revocadaEn } };
  });
}
