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
    error: { code: "forbidden", status: 403, message: "Se requiere el rol propietario" },
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

// Solo un propietario que aún no es broker, y solo una `pendiente` a la vez: el pre-chequeo evita
// la vuelta redonda a la base en el caso normal, y el índice único parcial respalda la carrera
// (doble request simultánea) — nunca un 500, siempre el mismo `conflict_pending_broker_request`.
export async function crearSolicitudBroker(
  actor: ActorAutenticado | null,
  input: { mensaje: string; empresa: string },
): Promise<ResultadoSolicitudBroker> {
  const permiso = requireRol(actor, "propietario");
  if (!permiso.ok || !actor) return errorForbidden();

  if (actor.isBroker) return errorYaBroker();

  const pendiente = await tienePendiente(actor.id);
  if (pendiente) return errorPendiente();

  try {
    const [fila] = await db
      .insert(brokerSolicitud)
      .values({ usuarioId: actor.id, mensaje: input.mensaje, empresa: input.empresa })
      .returning();
    if (!fila) throw new Error("insert de broker_solicitud no devolvió fila");
    return { ok: true, data: fila };
  } catch (err) {
    if (!esErrorPendiente(err)) throw err;
    return errorPendiente();
  }
}

// Mensajes de la solicitud que se abre sola al registrarse (o al pasar a publicar), según lo que la
// persona eligió. Los ve el admin en "Solicitudes de broker y dueños".
export const MENSAJE_SOLICITUD_POR_REGISTRO = {
  broker: "Se registró eligiendo «Soy broker».",
  dueno: "Se registró eligiendo «Soy el dueño».",
} as const;

// Todo propietario nuevo pasa por aprobación de Captive: "Soy broker" abre una solicitud de broker
// (aprobarla da el código BRK) y "Soy el dueño" una de dueño (aprobarla lo verifica). Si ya tiene una
// pendiente, no hace nada (índice único parcial). La llaman el alta de la cuenta y "Publica tu
// espacio", que ya validaron al usuario.
export async function abrirSolicitudPorRegistro(
  usuarioId: string,
  tipo: "broker" | "dueno",
  empresa = "",
): Promise<void> {
  await db
    .insert(brokerSolicitud)
    .values({ usuarioId, tipo, mensaje: MENSAJE_SOLICITUD_POR_REGISTRO[tipo], empresa })
    .onConflictDoNothing();
}
