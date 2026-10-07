import { CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { RequestActions } from "@/components/broker/request-actions";
import { listarPendientes } from "@/server/broker-requests/queries";
import { obtenerTextos } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.solicitudes.metaTitulo };
}

export default async function AdminBrokerRequestsPage() {
  const textos = (await obtenerTextos()).t.admin.solicitudes;
  const pendientes = await listarPendientes();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold text-text">{textos.titulo}</h1>
        <p className="text-sm text-text-muted">{textos.descripcion}</p>
      </div>

      {pendientes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-text-muted">
          <CheckIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
          <span className="text-sm">{textos.vacio}</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {pendientes.map((solicitud) => (
            <li key={solicitud.id}>
              <RequestActions solicitud={solicitud} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
