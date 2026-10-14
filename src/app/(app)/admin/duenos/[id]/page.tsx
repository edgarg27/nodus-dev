import { ArrowLeftIcon, ExternalLinkIcon, MailIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestDocuments } from "@/components/broker/request-documents";
import { ChatThread } from "@/components/messages/chat-thread";
import { ZONA_HORARIA } from "@/lib/clientes";
import { localeDe } from "@/lib/i18n";
import { iniciales } from "@/lib/initials";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerDueno } from "@/server/duenos/queries";
import { esUuid } from "@/server/http/envelope";
import { obtenerTextos } from "@/server/i18n";
import { obtenerChatParaCaptive } from "@/server/messages/captive";
import { listarDocumentosDe } from "@/server/verificacion/documentos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.duenos.metaTitulo };
}

interface AdminDuenoPageProps {
  params: Promise<{ id: string }>;
}

const COLOR_ESTADO = {
  pendiente: "bg-warning-foreground text-warning",
  publicada: "bg-success/15 text-success",
  rechazada: "bg-destructive/10 text-destructive",
} as const;

// Detalle de un dueño: sus datos, sus propiedades y el chat con Captive (el mismo que usan los
// clientes; abrirlo marca como leídos sus mensajes).
export default async function AdminDuenoPage({ params }: AdminDuenoPageProps) {
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const [{ idioma, t }, actor] = await Promise.all([obtenerTextos(), getUsuarioActual()]);
  const dueno = await obtenerDueno(actor, id);
  if (!dueno) notFound();
  const chat = (await obtenerChatParaCaptive(actor, id)) ?? [];
  const documentos = await listarDocumentosDe(id);
  const textos = t.admin.duenos;
  const formatoFecha = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: ZONA_HORARIA,
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/duenos"
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        {textos.volver}
      </Link>

      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">
          {iniciales(dueno.nombre)}
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold text-text">{dueno.nombre}</h1>
            {dueno.verificado ? null : (
              <Link
                href="/admin/broker-requests"
                className="rounded-full bg-warning-foreground px-2.5 py-0.5 text-xs font-bold text-warning hover:underline"
              >
                {textos.pendienteVerificar}
              </Link>
            )}
          </div>
          <span className="text-sm text-text-muted">
            {textos.registrado(formatoFecha.format(dueno.registradoEn))}
          </span>
        </div>
      </div>

      <RequestDocuments tipoSolicitud="dueno" documentos={documentos} t={t} />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="flex flex-col gap-4" aria-labelledby="titulo-propiedades">
          <h2 id="titulo-propiedades" className="text-lg font-bold text-text">
            {textos.propiedadesTitulo} · {dueno.propiedades.length}
          </h2>
          {dueno.propiedades.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-text-muted">
              {textos.sinPropiedadesTexto}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {dueno.propiedades.map((propiedad) => (
                <li
                  key={propiedad.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
                >
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/80 to-primary">
                    {propiedad.fotoUrl ? (
                      // biome-ignore lint/performance/noImgElement: foto subida por el propietario
                      <img src={propiedad.fotoUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 grow flex-col gap-1">
                    <span className="text-[11px] font-semibold tracking-wide text-warning uppercase">
                      {t.etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo} ·{" "}
                      {t.etiquetas.modalidad[propiedad.modalidad] ?? propiedad.modalidad}
                    </span>
                    <span className="truncate font-semibold text-text">
                      {propiedad.titulo ?? propiedad.direccion}
                    </span>
                    <span className="truncate text-sm text-text-muted">
                      {propiedad.titulo ? `${propiedad.direccion} · ` : ""}
                      {propiedad.ciudad}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${COLOR_ESTADO[propiedad.estadoPublicacion]}`}
                    >
                      {textos.estados[propiedad.estadoPublicacion]}
                    </span>
                    {propiedad.estadoPublicacion === "publicada" ? (
                      <Link
                        href={`/espacios/${propiedad.id}`}
                        target="_blank"
                        className="flex items-center gap-1 text-xs font-semibold text-text hover:text-primary"
                      >
                        {textos.verEspacio}
                        <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                      </Link>
                    ) : propiedad.estadoPublicacion === "pendiente" ? (
                      <Link
                        href="/admin/propiedades"
                        className="text-xs font-semibold text-text hover:text-primary"
                      >
                        {textos.revisar}
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-bold text-text">{textos.datos}</h2>
            <a
              href={`mailto:${dueno.email}`}
              className="flex items-center gap-2 text-sm text-text hover:text-primary"
            >
              <MailIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="truncate">{dueno.email}</span>
            </a>
            {dueno.telefono ? (
              <a
                href={`tel:${dueno.telefono}`}
                className="flex items-center gap-2 text-sm font-semibold text-text hover:text-primary"
              >
                <PhoneIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                {dueno.telefono}
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
            aria-labelledby="titulo-mensajes-dueno"
          >
            <h2 id="titulo-mensajes-dueno" className="text-sm font-bold text-text">
              {textos.mensajesTitulo}
            </h2>
            <ChatThread
              endpoint={`/api/v1/admin/clientes/${dueno.id}/mensajes`}
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
        </aside>
      </div>
    </div>
  );
}
