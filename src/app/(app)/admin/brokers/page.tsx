import { RequestActions } from "@/components/broker/request-actions";
import { RevokeForm } from "@/components/broker/revoke-form";
import { listarBrokersActivos, listarPendientes } from "@/server/broker-requests/queries";

export default async function AdminBrokersPage() {
  const pendientes = await listarPendientes();
  const activos = await listarBrokersActivos();

  return (
    <main>
      <h1>Brokers</h1>

      <section>
        <h2>Solicitudes pendientes</h2>
        {pendientes.length === 0 ? (
          <p>No hay solicitudes pendientes</p>
        ) : (
          <ul>
            {pendientes.map((solicitud) => (
              <li key={solicitud.id}>
                <p>{solicitud.usuario.nombre}</p>
                <p>{solicitud.usuario.email}</p>
                <p>{solicitud.usuario.telefono}</p>
                <p>{solicitud.mensaje}</p>
                <p>{solicitud.createdAt.toISOString()}</p>
                <RequestActions solicitudId={solicitud.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Brokers activos</h2>
        {activos.length === 0 ? (
          <p>No hay brokers activos</p>
        ) : (
          <ul>
            {activos.map((broker) => (
              <li key={broker.id}>
                <p>{broker.nombre}</p>
                <p>{broker.email}</p>
                <p>{broker.brokerCode}</p>
                <p>{broker.aprobadoEn?.toISOString() ?? "—"}</p>
                <RevokeForm usuarioId={broker.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
