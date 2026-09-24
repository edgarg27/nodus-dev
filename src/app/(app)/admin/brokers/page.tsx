import { RequestActions } from "@/components/broker/request-actions";
import { RevokeForm } from "@/components/broker/revoke-form";
import { listarBrokersActivos, listarPendientes } from "@/server/broker-requests/queries";

export default async function AdminBrokersPage() {
  const pendientes = await listarPendientes();
  const activos = await listarBrokersActivos();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Brokers</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-text">Solicitudes pendientes</h2>
        {pendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay solicitudes pendientes</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {pendientes.map((solicitud) => (
              <li
                key={solicitud.id}
                className="flex flex-col gap-1.5 rounded-lg bg-surface p-4 ring-1 ring-border shadow-sm"
              >
                <p className="text-sm font-medium text-text">{solicitud.usuario.nombre}</p>
                <p className="text-sm text-text-muted">{solicitud.usuario.email}</p>
                <p className="text-sm text-text-muted">{solicitud.usuario.telefono}</p>
                <p className="text-sm text-text">{solicitud.mensaje}</p>
                <p className="text-sm text-text-muted">{solicitud.createdAt.toISOString()}</p>
                <RequestActions solicitudId={solicitud.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-text">Brokers activos</h2>
        {activos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay brokers activos</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {activos.map((broker) => (
              <li
                key={broker.id}
                className="flex flex-col gap-1.5 rounded-lg bg-surface p-4 ring-1 ring-border shadow-sm"
              >
                <p className="text-sm font-medium text-text">{broker.nombre}</p>
                <p className="text-sm text-text-muted">{broker.email}</p>
                <p className="text-sm text-text-muted">{broker.brokerCode}</p>
                <p className="text-sm text-text-muted">{broker.aprobadoEn?.toISOString() ?? "—"}</p>
                <RevokeForm usuarioId={broker.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
