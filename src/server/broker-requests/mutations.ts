import { db } from "../../lib/db/client.ts";
import { brokerSolicitud } from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { tienePendiente } from "./queries.ts";

export type ErrorSolicitudBroker =
  | { code: "forbidden"; status: 403; message: string }
  | { code: "conflict_already_broker"; status: 409; message: string }
  | { code: "conflict_pending_broker_request"; status: 409; message: string };

export type SolicitudBrokerFila = typeof brokerSolicitud.$inferSelect;

export type ResultadoSolicitudBroker =
  | { ok: true; data: SolicitudBrokerFila }
  | { ok: false; error: ErrorSolicitudBroker };

function errorForbidden(): ResultadoSolicitudBroker {
  return {
    ok: false,
    error: { code: "forbidden", status: 403, message: "Se requiere el rol oferente" },
  };
}

function errorYaBroker(): ResultadoSolicitudBroker {
  return {
    ok: false,
    error: { code: "conflict_already_broker", status: 409, message: "Ya eres broker" },
  };
}

function errorPendiente(): ResultadoSolicitudBroker {
  return {
    ok: false,
    error: {
      code: "conflict_pending_broker_request",
      status: 409,
      message: "Ya tienes una solicitud pendiente",
    },
  };
}

function esErrorPendiente(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("cause" in err)) return false;
  const cause = (err as { cause?: unknown }).cause;
  return (
    typeof cause === "object" && cause !== null && (cause as { code?: string }).code === "23505"
  );
}

// Solo un oferente que aún no es broker, y solo una `pendiente` a la vez: el pre-chequeo evita
// la vuelta redonda a la base en el caso normal, y el índice único parcial respalda la carrera
// (doble request simultánea) — nunca un 500, siempre el mismo `conflict_pending_broker_request`.
export async function crearSolicitudBroker(
  actor: ActorAutenticado | null,
  mensaje: string,
): Promise<ResultadoSolicitudBroker> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return errorForbidden();

  if (actor.isBroker) return errorYaBroker();

  const pendiente = await tienePendiente(actor.id);
  if (pendiente) return errorPendiente();

  try {
    const [fila] = await db
      .insert(brokerSolicitud)
      .values({ usuarioId: actor.id, mensaje })
      .returning();
    if (!fila) throw new Error("insert de broker_solicitud no devolvió fila");
    return { ok: true, data: fila };
  } catch (err) {
    if (!esErrorPendiente(err)) throw err;
    return errorPendiente();
  }
}
