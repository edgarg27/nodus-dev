import { sql } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";

export interface ContadoresAdmin {
  propiedadesPendientes: number;
  solicitudesBroker: number;
  brokersActivos: number;
  // Clientes con alguna solicitud nueva sin atender o con un recordatorio vencido.
  clientesPorAtender: number;
  // Clientes con mensajes en el chat con Captive que nadie ha leído.
  chatsSinLeer: number;
}

// Los números del menú lateral del panel en UNA sola consulta (la base es remota: cada consulta
// es una vuelta por la red). Mismos criterios que las listas de cada apartado:
// listarPendientesDeRevision, listarPendientes, listarBrokersActivos, contarClientesPorAtender y
// clientesConMensajesSinLeer.
export async function contarParaMenuAdmin(ahora: Date = new Date()): Promise<ContadoresAdmin> {
  const ahoraIso = ahora.toISOString();
  const resultado = await db.execute<{
    propiedades: number;
    solicitudes: number;
    brokers: number;
    clientes: number;
    chats: number;
  }>(sql`
    select
      (select count(*)::int from propiedad
        where activo and estado_publicacion = 'pendiente') as propiedades,
      (select count(*)::int from broker_solicitud where estado = 'pendiente') as solicitudes,
      (select count(*)::int from usuario where is_broker) as brokers,
      (select count(distinct buscador_id)::int from contact_request
        where canal = 'captive'
          and (paso = 'nueva'
            or (paso not in ('cerrada', 'descartada')
              and proxima_accion_en <= ${ahoraIso}::timestamptz))) as clientes,
      (select count(distinct c.buscador_id)::int from mensaje_captive m
        join chat_captive c on c.id = m.chat_id
        where not m.de_captive and m.leido_en is null) as chats
  `);
  const fila = resultado[0];
  return {
    propiedadesPendientes: fila?.propiedades ?? 0,
    solicitudesBroker: fila?.solicitudes ?? 0,
    brokersActivos: fila?.brokers ?? 0,
    clientesPorAtender: fila?.clientes ?? 0,
    chatsSinLeer: fila?.chats ?? 0,
  };
}
