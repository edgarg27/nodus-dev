import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { brokerSolicitud, usuario } from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { generarBrokerCode } from "./broker-code.ts";

const MAX_INTENTOS_CODIGO = 5;

export type SolicitudFila = typeof brokerSolicitud.$inferSelect;

export type ErrorResolucion =
  | { code: "not_found"; status: 404; message: string }
  | { code: "forbidden"; status: 403; message: string }
  | { code: "conflict_already_resolved"; status: 409; message: string };

export type ResultadoResolucion =
  | { ok: true; data: SolicitudFila }
  | { ok: false; error: ErrorResolucion };

function errorNotFound(): ResultadoResolucion {
  return {
    ok: false,
    error: { code: "not_found", status: 404, message: "Solicitud no encontrada" },
  };
}

function errorForbidden(): ResultadoResolucion {
  return {
    ok: false,
    error: { code: "forbidden", status: 403, message: "No puedes resolver tu propia solicitud" },
  };
}

function errorYaResuelta(): ResultadoResolucion {
  return {
    ok: false,
    error: {
      code: "conflict_already_resolved",
      status: 409,
      message: "La solicitud ya fue resuelta",
    },
  };
}

function esErrorUnico(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("cause" in err)) return false;
  const cause = (err as { cause?: unknown }).cause;
  return (
    typeof cause === "object" && cause !== null && (cause as { code?: string }).code === "23505"
  );
}

type ResultadoValidacion =
  | { ok: true; solicitud: SolicitudFila }
  | { ok: false; error: ErrorResolucion };

async function validarActorYSolicitud(
  actor: ActorAutenticado | null,
  id: string,
): Promise<ResultadoValidacion> {
  const permiso = requireRol(actor, "admin");
  if (!permiso.ok || !actor) return errorNotFound() as ResultadoValidacion;

  const [solicitud] = await db.select().from(brokerSolicitud).where(eq(brokerSolicitud.id, id));
  if (!solicitud) return errorNotFound() as ResultadoValidacion;
  if (solicitud.usuarioId === actor.id) return errorForbidden() as ResultadoValidacion;

  return { ok: true, solicitud };
}

// Aprobar corre en una sola transacción: el UPDATE de broker_solicitud (el candado —
// `WHERE estado = 'pendiente'`) y el UPDATE de usuario que enciende is_broker y asigna el
// broker_code. Si el código choca con el unique, reintenta dentro de un savepoint hasta 5 veces;
// si se agotan, TODA la transacción se revierte (la solicitud sigue pendiente).
export async function aprobarSolicitud(
  actor: ActorAutenticado | null,
  id: string,
): Promise<ResultadoResolucion> {
  const validacion = await validarActorYSolicitud(actor, id);
  if (!validacion.ok) return { ok: false, error: validacion.error };
  if (!actor) return errorNotFound();

  return db.transaction(async (tx) => {
    const [resuelta] = await tx
      .update(brokerSolicitud)
      .set({ estado: "aprobada", resueltaPor: actor.id, resueltaEn: new Date() })
      .where(and(eq(brokerSolicitud.id, id), eq(brokerSolicitud.estado, "pendiente")))
      .returning();
    if (!resuelta) return errorYaResuelta();

    let asignado = false;
    for (let intento = 0; intento < MAX_INTENTOS_CODIGO && !asignado; intento++) {
      const codigo = generarBrokerCode();
      try {
        await tx.transaction(async (tx2) => {
          await tx2
            .update(usuario)
            .set({ isBroker: true, brokerCode: codigo })
            .where(eq(usuario.id, resuelta.usuarioId));
        });
        asignado = true;
      } catch (err) {
        if (!esErrorUnico(err)) throw err;
      }
    }
    if (!asignado) {
      throw new Error(
        `No se pudo asignar un broker_code único tras ${MAX_INTENTOS_CODIGO} intentos`,
      );
    }

    return { ok: true, data: resuelta };
  });
}

// Denegar es un único UPDATE con el mismo candado — no toca usuario.
export async function denegarSolicitud(
  actor: ActorAutenticado | null,
  id: string,
  motivo?: string,
): Promise<ResultadoResolucion> {
  const validacion = await validarActorYSolicitud(actor, id);
  if (!validacion.ok) return { ok: false, error: validacion.error };
  if (!actor) return errorNotFound();

  const motivoRecortado = motivo?.trim();
  const [resuelta] = await db
    .update(brokerSolicitud)
    .set({
      estado: "denegada",
      motivoDenegacion: motivoRecortado ? motivoRecortado.slice(0, 500) : null,
      resueltaPor: actor.id,
      resueltaEn: new Date(),
    })
    .where(and(eq(brokerSolicitud.id, id), eq(brokerSolicitud.estado, "pendiente")))
    .returning();
  if (!resuelta) return errorYaResuelta();

  return { ok: true, data: resuelta };
}
