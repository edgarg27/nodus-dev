import { eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { brokerSolicitud, usuario } from "../../lib/db/schema.ts";
import { documentosFaltantes, type TipoDocumento } from "../../lib/verificacion.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { ultimaSolicitudDe } from "../broker-requests/queries.ts";
import { type DocumentoVerificacion, listarDocumentosDe } from "./documentos.ts";

// `sin_solicitud`: cuentas que nunca pasaron por aprobación (sembradas o de staff) o un broker
// revocado; no tienen nada que verificar y publican como siempre.
export type EstadoVerificacion = "verificado" | "pendiente" | "denegada" | "sin_solicitud";

export interface Verificacion {
  estado: EstadoVerificacion;
  // "broker" o "dueno": decide qué documentos se piden.
  tipo: string;
  motivoDenegacion: string | null;
  documentos: DocumentoVerificacion[];
  faltantes: TipoDocumento[];
  puedePublicar: boolean;
}

async function estadoDe(usuarioId: string) {
  const [fila] = await db
    .select({ isBroker: usuario.isBroker, duenoVerificado: usuario.duenoVerificado })
    .from(usuario)
    .where(eq(usuario.id, usuarioId));
  if (fila?.isBroker || fila?.duenoVerificado) {
    return { estado: "verificado" as const, solicitud: null };
  }
  const solicitud = await ultimaSolicitudDe(usuarioId);
  if (solicitud?.estado === "pendiente" || solicitud?.estado === "denegada") {
    return { estado: solicitud.estado as "pendiente" | "denegada", solicitud };
  }
  return { estado: "sin_solicitud" as const, solicitud };
}

// Mientras Captive no apruebe a la persona (solicitud pendiente o denegada) no puede publicar.
export async function puedePublicar(usuarioId: string): Promise<boolean> {
  const { estado } = await estadoDe(usuarioId);
  return estado === "verificado" || estado === "sin_solicitud";
}

export async function obtenerVerificacion(usuarioId: string): Promise<Verificacion> {
  const [{ estado, solicitud }, documentos] = await Promise.all([
    estadoDe(usuarioId),
    listarDocumentosDe(usuarioId),
  ]);
  const tipo = solicitud?.tipo ?? "dueno";
  return {
    estado,
    tipo,
    motivoDenegacion: estado === "denegada" ? (solicitud?.motivoDenegacion ?? null) : null,
    documentos,
    faltantes: documentosFaltantes(tipo, documentos),
    puedePublicar: estado === "verificado" || estado === "sin_solicitud",
  };
}

export type ResultadoReenvio =
  | { ok: true }
  | {
      ok: false;
      error:
        | { code: "forbidden"; status: 403; message: string }
        | { code: "validation_error"; status: 422; message: string }
        | { code: "conflict_not_denied"; status: 409; message: string };
    };

// Tras una denegación, la persona corrige sus documentos y vuelve a pedir la revisión: se abre una
// solicitud nueva del mismo tipo (la denegada queda como historial).
export async function reenviarVerificacion(
  actor: ActorAutenticado | null,
): Promise<ResultadoReenvio> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) {
    return {
      ok: false,
      error: { code: "forbidden", status: 403, message: "Se requiere el rol oferente" },
    };
  }

  const verificacion = await obtenerVerificacion(actor.id);
  if (verificacion.estado !== "denegada") {
    return {
      ok: false,
      error: {
        code: "conflict_not_denied",
        status: 409,
        message: "Tu cuenta no tiene una verificación pendiente",
      },
    };
  }
  if (verificacion.faltantes.length > 0) {
    return {
      ok: false,
      error: { code: "validation_error", status: 422, message: "Faltan documentos por subir" },
    };
  }

  const anterior = await ultimaSolicitudDe(actor.id);
  await db
    .insert(brokerSolicitud)
    .values({
      usuarioId: actor.id,
      tipo: verificacion.tipo,
      empresa: anterior?.empresa ?? "",
      mensaje: "Volvió a enviar sus documentos para revisión.",
    })
    .onConflictDoNothing();
  return { ok: true };
}
