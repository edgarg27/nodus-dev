import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { brokerRevocacion, brokerSolicitud, usuario } from "../../lib/db/schema.ts";

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

export interface BrokerActivo {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  brokerCode: string | null;
  aprobadoEn: Date | null;
}

// Brokers activos, por nombre, con la fecha de su última aprobación (null para un broker
// sembrado sin ninguna broker_solicitud).
export async function listarBrokersActivos(): Promise<BrokerActivo[]> {
  const brokers = await db
    .select({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      brokerCode: usuario.brokerCode,
    })
    .from(usuario)
    .where(eq(usuario.isBroker, true))
    .orderBy(asc(usuario.nombre));

  if (brokers.length === 0) return [];

  const ids = brokers.map((broker) => broker.id);
  const aprobaciones = await db
    .select({ usuarioId: brokerSolicitud.usuarioId, resueltaEn: brokerSolicitud.resueltaEn })
    .from(brokerSolicitud)
    .where(and(inArray(brokerSolicitud.usuarioId, ids), eq(brokerSolicitud.estado, "aprobada")))
    .orderBy(desc(brokerSolicitud.resueltaEn));

  const aprobadoEnPorUsuario = new Map<string, Date | null>();
  for (const fila of aprobaciones) {
    if (!aprobadoEnPorUsuario.has(fila.usuarioId)) {
      aprobadoEnPorUsuario.set(fila.usuarioId, fila.resueltaEn);
    }
  }

  return brokers.map((broker) => ({
    ...broker,
    aprobadoEn: aprobadoEnPorUsuario.get(broker.id) ?? null,
  }));
}

// La revocación más reciente de un usuario, o null — usada por la pantalla del solicitante.
export async function ultimaRevocacionDe(usuarioId: string) {
  const [fila] = await db
    .select()
    .from(brokerRevocacion)
    .where(eq(brokerRevocacion.usuarioId, usuarioId))
    .orderBy(desc(brokerRevocacion.revocadaEn))
    .limit(1);
  return fila ?? null;
}
