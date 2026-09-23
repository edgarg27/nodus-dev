import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { brokerSolicitud, usuario } from "../../lib/db/schema.ts";

export async function ultimaSolicitudDe(usuarioId: string) {
  const [fila] = await db
    .select()
    .from(brokerSolicitud)
    .where(eq(brokerSolicitud.usuarioId, usuarioId))
    .orderBy(desc(brokerSolicitud.createdAt))
    .limit(1);
  return fila ?? null;
}

export async function tienePendiente(usuarioId: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: brokerSolicitud.id })
    .from(brokerSolicitud)
    .where(and(eq(brokerSolicitud.usuarioId, usuarioId), eq(brokerSolicitud.estado, "pendiente")))
    .limit(1);
  return fila !== undefined;
}

// Cola del admin: solicitudes pendiente, la más antigua primero, con los datos del solicitante.
export async function listarPendientes() {
  return db
    .select({
      id: brokerSolicitud.id,
      mensaje: brokerSolicitud.mensaje,
      createdAt: brokerSolicitud.createdAt,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
      },
    })
    .from(brokerSolicitud)
    .innerJoin(usuario, eq(brokerSolicitud.usuarioId, usuario.id))
    .where(eq(brokerSolicitud.estado, "pendiente"))
    .orderBy(asc(brokerSolicitud.createdAt));
}
