import { ArrowLeftIcon, ChevronDownIcon, MailIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EstadoBadge } from "@/components/admin/clientes/estado-badge";
import { NotaForm } from "@/components/admin/clientes/nota-form";
import { NotasLista } from "@/components/admin/clientes/notas-lista";
import { SolicitudClienteCard } from "@/components/admin/clientes/solicitud-cliente-card";
import { ChatThread } from "@/components/messages/chat-thread";
import { ZONA_HORARIA } from "@/lib/clientes";
import { localeDe } from "@/lib/i18n";
import { iniciales } from "@/lib/initials";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerCliente } from "@/server/clientes/detalle";
import { esUuid } from "@/server/http/envelope";
import { obtenerTextos } from "@/server/i18n";
import { obtenerChatParaCaptive } from "@/server/messages/captive";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.clientes.metaTitulo };
}

interface AdminClientePageProps {
  params: Promise<{ id: string }>;
}

// Detalle de un cliente: sus solicitudes (cada una con su paso, su próxima acción y el contacto del
// broker para confirmar disponibilidad) y la bitácora de llamadas, notas y cambios de paso.
export default async function AdminClientePage({ params }: AdminClientePageProps) {
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const [{ idioma, t }, actor] = await Promise.all([obtenerTextos(), getUsuarioActual()]);
  const cliente = await obtenerCliente(actor, id);
  if (!cliente) notFound();
  // Abrir el detalle marca como leídos los mensajes del cliente.
  const chat = (await obtenerChatParaCaptive(actor, id)) ?? [];

  const textos = t.admin.clientes;
  const locale = localeDe(idioma);
  const formatoFecha = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: ZONA_HORARIA,
  });
  const formatoFechaHora = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: ZONA_HORARIA,
  });
  const ahora = new Date();
  // Las nuevas (le llegaron a Captive) a la vista; las anteriores (directo al oferente), aparte.
  const nuevas = cliente.solicitudes.filter((s) => s.canal === "captive");
  const anteriores = cliente.solicitudes.filter((s) => s.canal === "directo");
  const etiquetaSolicitud = new Map(
    cliente.solicitudes.map((s) => [s.id, s.propiedad.titulo ?? s.propiedad.direccion]),
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/clientes"
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        {textos.volver}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">
            {iniciales(cliente.nombre)}
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-bold text-text">{cliente.nombre}</h1>
              {cliente.estado ? (
                <EstadoBadge estado={cliente.estado} etiqueta={textos.estados[cliente.estado]} />
              ) : null}
            </div>
            <span className="text-sm text-text-muted">
              {textos.registrado(formatoFecha.format(cliente.registradoEn))}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="flex flex-col gap-4" aria-labelledby="titulo-solicitudes">
          <h2 id="titulo-solicitudes" className="text-lg font-bold text-text">
            {textos.solicitudesTitulo} · {nuevas.length}
          </h2>
          {nuevas.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-text-muted">
              {anteriores.length > 0 ? textos.sinNuevas : textos.sinSolicitudesTexto}
            </p>
          ) : (
            nuevas.map((solicitud) => (
              <SolicitudClienteCard
                key={solicitud.id}
                solicitud={solicitud}
                textos={textos}
                etiquetas={t.etiquetas}
                formatoFecha={formatoFecha}
                formatoFechaHora={formatoFechaHora}
                ahora={ahora}
              />
            ))
          )}

          {anteriores.length > 0 ? (
            // Las que le llegaron directo al oferente antes del cambio: cerradas hasta que se
            // pidan, para no mezclarlas con las nuevas.
            <details className="group flex flex-col gap-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-sm font-semibold text-text transition-colors hover:border-primary [&::-webkit-details-marker]:hidden">
                <span className="flex flex-col gap-0.5">
                  {textos.anteriores(anteriores.length)}
                  <span className="text-xs font-normal text-text-muted">
                    {textos.anterioresAyuda}
                  </span>
                </span>
                <ChevronDownIcon
                  className="size-4 shrink-0 text-text-muted transition-transform duration-200 ease-out group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                {anteriores.map((solicitud) => (
                  <SolicitudClienteCard
                    key={solicitud.id}
                    solicitud={solicitud}
                    textos={textos}
                    etiquetas={t.etiquetas}
                    formatoFecha={formatoFecha}
                    formatoFechaHora={formatoFechaHora}
                    ahora={ahora}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-bold text-text">{textos.datosCliente}</h2>
            <a
              href={`mailto:${cliente.email}`}
              className="flex items-center gap-2 text-sm text-text hover:text-primary"
            >
              <MailIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="truncate">{cliente.email}</span>
            </a>
            {cliente.telefono ? (
              <a
                href={`tel:${cliente.telefono}`}
                className="flex items-center gap-2 text-sm font-semibold text-text hover:text-primary"
              >
                <PhoneIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                {cliente.telefono}
              </a>
            ) : (
              <span className="flex items-center gap-2 text-sm text-text-muted">
                <PhoneIcon className="size-4 shrink-0" aria-hidden="true" />
                {textos.sinTelefono}
              </span>
            )}
          </section>

          <section
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            aria-labelledby="titulo-mensajes"
          >
            <h2 id="titulo-mensajes" className="text-sm font-bold text-text">
              {textos.mensajesTitulo}
            </h2>
            <ChatThread
              endpoint={`/api/v1/admin/clientes/${cliente.id}/mensajes`}
              compacta
              mensajes={chat.map((mensaje) => ({
                id: mensaje.id,
                texto: mensaje.texto,
                mio: mensaje.mio,
                autor: mensaje.autor,
                createdAt: mensaje.createdAt.toISOString(),
              }))}
            />
          </section>
          <section
            className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            aria-labelledby="titulo-seguimiento"
          >
            <h2 id="titulo-seguimiento" className="text-sm font-bold text-text">
              {textos.seguimientoTitulo}
            </h2>
            {/* Con solicitudes nuevas se escribe en cada una ("¿Qué pasó?"); aquí solo queda el
                historial. Un prospecto sin solicitudes se anota aquí. */}
            {nuevas.length === 0 ? <NotaForm clienteId={cliente.id} /> : null}
            <NotasLista
              notas={cliente.notas}
              etiquetaSolicitud={etiquetaSolicitud}
              textos={textos}
              formatoFechaHora={formatoFechaHora}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
