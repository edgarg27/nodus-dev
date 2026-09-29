import { UsersIcon } from "lucide-react";
import { RevokeForm } from "@/components/broker/revoke-form";
import { listarBrokersActivos } from "@/server/broker-requests/queries";

export default async function AdminBrokersPage() {
  const activos = await listarBrokersActivos();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold text-text">Brokers activos</h1>
        <p className="text-sm text-text-muted">
          Oferentes con solicitud de broker aprobada. Puedes revocar su acceso en cualquier momento.
        </p>
      </div>

      {activos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-text-muted">
          <UsersIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
          <span className="text-sm">Todavía no hay brokers aprobados.</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {activos.map((broker) => (
            <li key={broker.id}>
              <RevokeForm broker={broker} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
