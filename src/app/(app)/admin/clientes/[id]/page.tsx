import { ArrowLeftIcon, MailIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EstadoBadge } from "@/components/admin/clientes/estado-badge";
import { EstadoClienteSelect } from "@/components/admin/clientes/estado-cliente-select";
import { NotaForm } from "@/components/admin/clientes/nota-form";
import { NotasLista } from "@/components/admin/clientes/notas-lista";
import { SolicitudClienteCard } from "@/components/admin/clientes/solicitud-cliente-card";
import { localeDe } from "@/lib/i18n";
import { iniciales } from "@/lib/initials";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerCliente } from "@/server/clientes/queries";
import { esUuid } from "@/server/http/envelope";
import { obtenerTextos } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.clientes.metaTitulo };
}

interface AdminClientePageProps {
  params: Promise<{ id: string }>;
}

// Detalle de un cliente: sus solicitudes (con el contacto del broker para confirmar disponibilidad),
// la etapa del seguimiento y la bitácora de llamadas y notas.
export default async function AdminClientePage({ params }: AdminClientePageProps) {
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const [{ idioma, t }, actor] = await Promise.all([obtenerTextos(), getUsuarioActual()]);
  const cliente = await obtenerCliente(actor, id);
  if (!cliente) notFound();

  const textos = t.admin.clientes;
  const locale = localeDe(idioma);
  const formatoFecha = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formatoFechaHora = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
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
              <EstadoBadge estado={cliente.estado} etiqueta={textos.estados[cliente.estado]} />
            </div>
            <span className="text-sm text-text-muted">
              {textos.registrado(formatoFecha.format(cliente.registradoEn))}
            </span>
          </div>
        </div>
        <div className="w-full sm:w-56">
          <EstadoClienteSelect
            key={cliente.estado}
            clienteId={cliente.id}
            estado={cliente.estado}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="flex flex-col gap-4" aria-labelledby="titulo-solicitudes">
          <h2 id="titulo-solicitudes" className="text-lg font-bold text-text">
            {textos.solicitudesTitulo} · {cliente.solicitudes.length}
          </h2>
          {cliente.solicitudes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-text-muted">
              {textos.sinSolicitudesTexto}
            </p>
          ) : (
            cliente.solicitudes.map((solicitud) => (
              <SolicitudClienteCard
                key={solicitud.id}
                solicitud={solicitud}
                textos={textos}
                etiquetas={t.etiquetas}
                formatoFecha={formatoFecha}
              />
            ))
          )}
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
            className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            aria-labelledby="titulo-seguimiento"
          >
            <h2 id="titulo-seguimiento" className="text-sm font-bold text-text">
              {textos.seguimientoTitulo}
            </h2>
            <NotaForm
              clienteId={cliente.id}
              solicitudes={cliente.solicitudes.map((s) => ({
                id: s.id,
                etiqueta: etiquetaSolicitud.get(s.id) ?? s.id,
              }))}
            />
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
