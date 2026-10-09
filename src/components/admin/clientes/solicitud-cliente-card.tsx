import { CalendarClockIcon, ExternalLinkIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import type { Textos } from "@/lib/i18n";
import type { SolicitudDeCliente } from "@/server/clientes/detalle";
import { ActualizarSolicitudForm } from "./actualizar-solicitud-form";
import { PasoBadge } from "./paso-badge";

interface SolicitudClienteCardProps {
  solicitud: SolicitudDeCliente;
  textos: Textos["admin"]["clientes"];
  etiquetas: Textos["etiquetas"];
  formatoFecha: Intl.DateTimeFormat;
  formatoFechaHora: Intl.DateTimeFormat;
  // Para marcar la próxima acción como vencida.
  ahora: Date;
}

function digitos(telefono: string): string {
  return telefono.replace(/\D/g, "");
}

// Una solicitud del cliente: el espacio, lo que pidió y a quién llamarle para confirmar.
export function SolicitudClienteCard({
  solicitud,
  textos,
  etiquetas,
  formatoFecha,
  formatoFechaHora,
  ahora,
}: SolicitudClienteCardProps) {
  const { propiedad, oferente } = solicitud;
  const telefono = oferente.whatsapp ?? oferente.telefono;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-warning uppercase">
            {etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo} ·{" "}
            {etiquetas.modalidad[propiedad.modalidad] ?? propiedad.modalidad}
          </span>
          <h3 className="font-semibold text-text">{propiedad.titulo ?? propiedad.direccion}</h3>
          <span className="text-sm text-text-muted">
            {propiedad.titulo ? `${propiedad.direccion} · ` : ""}
            {propiedad.ciudad}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-text-muted">
          <span>{formatoFecha.format(solicitud.creadaEn)}</span>
          {propiedad.publicada ? (
            <Link
              href={`/espacios/${propiedad.id}`}
              target="_blank"
              className="flex items-center gap-1 font-semibold text-text hover:text-primary"
            >
              {textos.verEspacio}
              <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <span className="font-semibold">{textos.noPublicado}</span>
          )}
        </div>
      </div>

      {solicitud.quiereFinanciamiento || solicitud.canal === "directo" ? (
        <div className="flex flex-wrap gap-2">
          {solicitud.quiereFinanciamiento ? (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
              {textos.financiamiento}
            </span>
          ) : null}
          {solicitud.canal === "directo" ? (
            <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold text-text-muted">
              {textos.directo}
            </span>
          ) : null}
        </div>
      ) : null}

      {solicitud.canal === "captive" ? (
        // Seguimiento de Captive: en qué paso va y qué sigue.
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <PasoBadge paso={solicitud.paso} etiqueta={textos.pasos[solicitud.paso]} />
          {solicitud.proximaAccion ? (
            <span
              className={`flex items-center gap-1.5 text-sm ${
                solicitud.proximaAccion.en < ahora ? "font-semibold text-destructive" : "text-text"
              }`}
            >
              <CalendarClockIcon className="size-4 shrink-0" aria-hidden="true" />
              {solicitud.proximaAccion.texto} ·{" "}
              {formatoFechaHora.format(solicitud.proximaAccion.en)}
              {solicitud.proximaAccion.en < ahora ? ` · ${textos.vencida}` : ""}
            </span>
          ) : (
            <span className="text-sm text-text-muted">{textos.sinProximaAccion}</span>
          )}
        </div>
      ) : null}

      {solicitud.mensaje ? (
        <div className="flex flex-col gap-1 rounded-xl bg-background p-3.5">
          <span className="text-xs font-semibold text-text-muted">{textos.mensajeCliente}</span>
          <p className="text-sm whitespace-pre-line text-text">{solicitud.mensaje}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">
          {textos.confirmarCon}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold text-text">{oferente.agencia}</span>
            <span className="text-sm text-text-muted">
              {oferente.nombre !== oferente.agencia ? `${oferente.nombre} · ` : ""}
              {oferente.email}
            </span>
            {oferente.esBroker && oferente.brokerCode ? (
              <span className="text-xs font-bold text-success">
                {textos.brokerVerificado(oferente.brokerCode)}
              </span>
            ) : null}
          </div>
          {telefono ? (
            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${telefono}`}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <PhoneIcon className="size-4" aria-hidden="true" />
                {telefono}
              </a>
              {oferente.whatsapp ? (
                <a
                  href={`https://wa.me/${digitos(oferente.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-semibold text-text hover:border-primary"
                >
                  <MessageCircleIcon className="size-4" aria-hidden="true" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : (
            <span className="text-sm text-text-muted">{textos.sinTelefono}</span>
          )}
        </div>
        {solicitud.brokerReferido ? (
          <span className="text-xs text-text-muted">
            {textos.referidoPor(solicitud.brokerReferido)}
          </span>
        ) : null}
      </div>
      {solicitud.canal === "captive" ? (
        <ActualizarSolicitudForm
          key={`${solicitud.paso}-${solicitud.proximaAccion?.en.getTime() ?? ""}`}
          solicitudId={solicitud.id}
          paso={solicitud.paso}
          proximaAccion={solicitud.proximaAccion}
        />
      ) : null}
    </article>
  );
}
