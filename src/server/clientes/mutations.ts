import { and, eq, ne } from "drizzle-orm";
import {
  type PasoSolicitud,
  pasoTerminado,
  type TipoNota,
  type TipoNotaManual,
} from "../../lib/clientes.ts";
import { db } from "../../lib/db/client.ts";
import { contactRequest, seguimientoNota, usuario } from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

type ErrorCliente = { code: "not_found"; status: 404; message: string };

export interface NotaCreada {
  id: string;
  tipo: TipoNota;
  texto: string;
  creadaEn: Date;
  contactRequestId: string | null;
}

export type ResultadoNota = { ok: true; data: NotaCreada } | { ok: false; error: ErrorCliente };

function noEncontrado(message = "Cliente no encontrado"): { ok: false; error: ErrorCliente } {
  return { ok: false, error: { code: "not_found", status: 404, message } };
}

// Un cliente es cualquier usuario que no sea admin (un buscador, o un oferente que antes pidió
// informes). Un admin, o un id que no existe, se responde igual: 404.
async function existeCliente(buscadorId: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(and(eq(usuario.id, buscadorId), ne(usuario.rol, "admin")));
  return Boolean(fila);
}

// No es idempotente a propósito: cada nota es una llamada o un apunte distinto de la bitácora.
export async function agregarNotaCliente(
  actor: ActorAutenticado | null,
  buscadorId: string,
  datos: { tipo: TipoNotaManual; texto: string },
): Promise<ResultadoNota> {
  if (!requireRol(actor, "admin").ok || !actor) return noEncontrado();
  if (!(await existeCliente(buscadorId))) return noEncontrado();

  const [nota] = await db
    .insert(seguimientoNota)
    .values({ buscadorId, autorId: actor.id, tipo: datos.tipo, texto: datos.texto })
    .returning();
  if (!nota) throw new Error("insert de seguimiento_nota no devolvió fila");

  return {
    ok: true,
    data: {
      id: nota.id,
      tipo: nota.tipo as TipoNota,
      texto: nota.texto,
      creadaEn: nota.createdAt,
      contactRequestId: nota.contactRequestId,
    },
  };
}

export interface CambiosSolicitud {
  paso: PasoSolicitud;
  // `null` borra la próxima acción. Al terminar la solicitud (cerrada/descartada) se borra sola.
  proximaAccion: { texto: string; en: Date } | null;
  // Se guarda como nota ligada a la solicitud.
  comentario?: string;
}

export interface SolicitudActualizada {
  id: string;
  paso: PasoSolicitud;
  proximaAccion: { texto: string; en: Date } | null;
}

export type ResultadoSolicitud =
  | { ok: true; data: SolicitudActualizada }
  | { ok: false; error: ErrorCliente };

// Actualiza el seguimiento de Captive a una solicitud (solo canal "captive": las anteriores son del
// oferente). Si el paso cambia, queda anotado en la bitácora con quién y cuándo; repetir los mismos
// datos sin comentario no agrega nada.
export async function actualizarSolicitud(
  actor: ActorAutenticado | null,
  solicitudId: string,
  cambios: CambiosSolicitud,
): Promise<ResultadoSolicitud> {
  if (!requireRol(actor, "admin").ok || !actor) return noEncontrado("Solicitud no encontrada");

  const proximaAccion = pasoTerminado(cambios.paso) ? null : cambios.proximaAccion;

  return db.transaction(async (tx) => {
    const [actual] = await tx
      .select({
        id: contactRequest.id,
        buscadorId: contactRequest.buscadorId,
        paso: contactRequest.paso,
      })
      .from(contactRequest)
      .where(and(eq(contactRequest.id, solicitudId), eq(contactRequest.canal, "captive")))
      .for("update");
    if (!actual) return noEncontrado("Solicitud no encontrada");

    await tx
      .update(contactRequest)
      .set({
        paso: cambios.paso,
        proximaAccion: proximaAccion?.texto ?? null,
        proximaAccionEn: proximaAccion?.en ?? null,
      })
      .where(eq(contactRequest.id, solicitudId));

    const notas: (typeof seguimientoNota.$inferInsert)[] = [];
    if (actual.paso !== cambios.paso) {
      notas.push({
        buscadorId: actual.buscadorId,
        contactRequestId: solicitudId,
        autorId: actor.id,
        tipo: "paso",
        texto: cambios.paso,
      });
    }
    if (cambios.comentario) {
      notas.push({
        buscadorId: actual.buscadorId,
        contactRequestId: solicitudId,
        autorId: actor.id,
        tipo: "nota",
        texto: cambios.comentario,
      });
    }
    if (notas.length > 0) await tx.insert(seguimientoNota).values(notas);

    return { ok: true as const, data: { id: solicitudId, paso: cambios.paso, proximaAccion } };
  });
}
