import { and, eq, ne } from "drizzle-orm";
import type { EstadoCliente, TipoNota } from "../../lib/clientes.ts";
import { db } from "../../lib/db/client.ts";
import {
  contactRequest,
  seguimientoCliente,
  seguimientoNota,
  usuario,
} from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

type ErrorCliente = { code: "not_found"; status: 404; message: string };

export type ResultadoEstadoCliente =
  | { ok: true; data: { buscadorId: string; estado: EstadoCliente } }
  | { ok: false; error: ErrorCliente };

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

// Idempotente: repetir el mismo estado deja el mismo resultado.
export async function cambiarEstadoCliente(
  actor: ActorAutenticado | null,
  buscadorId: string,
  estado: EstadoCliente,
): Promise<ResultadoEstadoCliente> {
  if (!requireRol(actor, "admin").ok) return noEncontrado();
  if (!(await existeCliente(buscadorId))) return noEncontrado();

  await db
    .insert(seguimientoCliente)
    .values({ buscadorId, estado })
    .onConflictDoUpdate({ target: seguimientoCliente.buscadorId, set: { estado } });
  return { ok: true, data: { buscadorId, estado } };
}

// No es idempotente a propósito: cada nota es una llamada o un apunte distinto de la bitácora.
export async function agregarNotaCliente(
  actor: ActorAutenticado | null,
  buscadorId: string,
  datos: { tipo: TipoNota; texto: string; contactRequestId?: string | null },
): Promise<ResultadoNota> {
  if (!requireRol(actor, "admin").ok || !actor) return noEncontrado();
  if (!(await existeCliente(buscadorId))) return noEncontrado();

  const contactRequestId = datos.contactRequestId ?? null;
  if (contactRequestId) {
    // La solicitud tiene que ser de este cliente.
    const [solicitud] = await db
      .select({ id: contactRequest.id })
      .from(contactRequest)
      .where(
        and(eq(contactRequest.id, contactRequestId), eq(contactRequest.buscadorId, buscadorId)),
      );
    if (!solicitud) return noEncontrado("Solicitud no encontrada");
  }

  const [nota] = await db
    .insert(seguimientoNota)
    .values({
      buscadorId,
      contactRequestId,
      autorId: actor.id,
      tipo: datos.tipo,
      texto: datos.texto,
    })
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

// Una solicitud nueva regresa al cliente a "pendiente" para que Captive la atienda. La llama
// crearContactRequest, que ya validó al buscador.
export async function marcarClientePendiente(buscadorId: string): Promise<void> {
  await db
    .insert(seguimientoCliente)
    .values({ buscadorId, estado: "pendiente" })
    .onConflictDoUpdate({ target: seguimientoCliente.buscadorId, set: { estado: "pendiente" } });
}
