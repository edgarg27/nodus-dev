import { CalendarClockIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { Textos } from "@/lib/i18n";
import type { AccionPendiente } from "@/server/clientes/queries";
import { PasoBadge } from "./paso-badge";

interface AccionesPendientesProps {
  acciones: AccionPendiente[];
  textos: Textos["admin"]["clientes"];
  formatoFechaHora: Intl.DateTimeFormat;
}

// "Por hacer hoy": las próximas acciones de hoy y las vencidas, arriba de la lista de clientes.
export function AccionesPendientes({
  acciones,
  textos,
  formatoFechaHora,
}: AccionesPendientesProps) {
  return (
    <section
      aria-labelledby="titulo-acciones"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="titulo-acciones" className="flex items-center gap-2 text-base font-bold text-text">
          <CalendarClockIcon className="size-5 text-accent" aria-hidden="true" />
          {textos.accionesTitulo} · {acciones.length}
        </h2>
        <p className="text-sm text-text-muted">{textos.accionesDescripcion}</p>
      </div>

      {acciones.length === 0 ? (
        <p className="text-sm text-text-muted">{textos.sinAcciones}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {acciones.map((accion) => (
            <li key={accion.solicitudId}>
              <Link
                href={`/admin/clientes/${accion.clienteId}`}
                className="flex items-center gap-3 rounded-xl bg-background px-4 py-3 transition-colors duration-150 ease-out hover:bg-muted"
              >
                <div className="flex min-w-0 grow flex-col gap-1">
                  <span className="truncate text-sm font-semibold text-text">{accion.texto}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    {accion.clienteNombre} · {accion.espacio}
                    <PasoBadge paso={accion.paso} etiqueta={textos.pasos[accion.paso]} />
                  </span>
                </div>
                <span
                  className={`shrink-0 text-right text-xs font-semibold ${
                    accion.vencida ? "text-destructive" : "text-text"
                  }`}
                >
                  {accion.vencida ? textos.vencida : textos.hoy}
                  <br />
                  <span className="font-normal">{formatoFechaHora.format(accion.en)}</span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
