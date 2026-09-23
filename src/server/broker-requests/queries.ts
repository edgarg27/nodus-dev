import { and, desc, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { brokerSolicitud } from "../../lib/db/schema.ts";

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
