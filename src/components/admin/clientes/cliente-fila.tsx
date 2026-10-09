import { CalendarClockIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { Textos } from "@/lib/i18n";
import { iniciales } from "@/lib/initials";
import type { ClienteResumen } from "@/server/clientes/queries";
import { EstadoBadge } from "./estado-badge";

interface ClienteFilaProps {
  cliente: ClienteResumen;
  textos: Textos["admin"]["clientes"];
  formatoFecha: Intl.DateTimeFormat;
  formatoFechaHora: Intl.DateTimeFormat;
  ahora: Date;
}

// Un cliente en la lista de "Clientes y prospectos"; abre su detalle.
export function ClienteFila({
  cliente,
  textos,
  formatoFecha,
  formatoFechaHora,
  ahora,
}: ClienteFilaProps) {
  const vencida = cliente.proximaAccion ? cliente.proximaAccion.en < ahora : false;
  return (
    <Link
      href={`/admin/clientes/${cliente.id}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors duration-150 ease-out hover:border-primary"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
        {iniciales(cliente.nombre)}
      </span>

      <div className="flex min-w-0 grow flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-text">{cliente.nombre}</span>
          {cliente.estado ? (
            <EstadoBadge estado={cliente.estado} etiqueta={textos.estados[cliente.estado]} />
          ) : null}
          {cliente.mensajesSinLeer > 0 ? (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
              {textos.mensajesNuevos(cliente.mensajesSinLeer)}
            </span>
          ) : null}
          {cliente.quiereFinanciamiento ? (
            <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold text-text-muted">
              {textos.financiamiento}
            </span>
          ) : null}
        </div>
        <span className="truncate text-sm text-text-muted">
          {cliente.email}
          {cliente.telefono ? ` · ${cliente.telefono}` : ""}
        </span>
        {cliente.proximaAccion ? (
          <span
            className={`flex items-center gap-1.5 truncate text-sm ${
              vencida ? "font-semibold text-destructive" : "text-text"
            }`}
          >
            <CalendarClockIcon className="size-4 shrink-0" aria-hidden="true" />
            {cliente.proximaAccion.texto} · {formatoFechaHora.format(cliente.proximaAccion.en)}
            {vencida ? ` · ${textos.vencida}` : ""}
          </span>
        ) : null}
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1 text-right text-xs text-text-muted sm:flex">
        <span className="text-sm font-semibold text-text">
          {cliente.solicitudes > 0
            ? textos.solicitudes(cliente.solicitudes)
            : textos.sinSolicitudes}
        </span>
        <span>
          {cliente.ultimaSolicitud
            ? textos.ultimaSolicitud(formatoFecha.format(cliente.ultimaSolicitud))
            : textos.registrado(formatoFecha.format(cliente.registradoEn))}
        </span>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
    </Link>
  );
}
