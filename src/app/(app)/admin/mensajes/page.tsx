import { MessageCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ZONA_HORARIA } from "@/lib/clientes";
import { localeDe } from "@/lib/i18n";
import { iniciales } from "@/lib/initials";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";
import { listarChatsParaCaptive } from "@/server/messages/captive";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.mensajes.metaTitulo };
}

// Bandeja de Mensajes del panel: el chat de cada cliente con Captive. El layout ya exige rol admin.
export default async function AdminMensajesPage() {
  const [{ idioma, t }, actor] = await Promise.all([obtenerTextos(), getUsuarioActual()]);
  const textos = t.admin.mensajes;
  const chats = await listarChatsParaCaptive(actor);
  const formatoFecha = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    timeZone: ZONA_HORARIA,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold text-text">{textos.titulo}</h1>
        <p className="max-w-3xl text-sm text-text-muted">{textos.descripcion}</p>
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-text-muted">
          <MessageCircleIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
          <span className="text-sm">{textos.vacio}</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {chats.map((chat) => (
            <li key={chat.buscadorId}>
              <Link
                href={`/admin/mensajes/${chat.buscadorId}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors duration-150 ease-out hover:border-primary"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                  {iniciales(chat.nombre)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold text-text">
                    {chat.nombre}
                  </span>
                  <span className="truncate text-xs text-text-muted">{chat.email}</span>
                  {chat.ultimo ? (
                    <span
                      className={`truncate text-sm ${
                        chat.noLeidos > 0 ? "font-semibold text-text" : "text-text-muted"
                      }`}
                    >
                      {chat.ultimo.deCaptive ? `${textos.tu}: ` : ""}
                      {chat.ultimo.texto}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {chat.ultimo ? (
                    <span className="text-xs text-text-muted">
                      {formatoFecha.format(chat.ultimo.createdAt)}
                    </span>
                  ) : null}
                  {chat.noLeidos > 0 ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                      {chat.noLeidos}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
