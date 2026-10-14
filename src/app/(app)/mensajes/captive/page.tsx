import { ChevronLeftIcon, HeadsetIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatThread } from "@/components/messages/chat-thread";
import { MENSAJES_VISIBLE_PARA_PROPIETARIO } from "@/lib/propietario-visibilidad";
import { contarFiltrosActivos, describirBusqueda, leerBusqueda } from "@/lib/search-params";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";
import { obtenerChatDelCliente } from "@/server/messages/captive";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: `${t.panel.mensajes.captiveNombre} — Captive by Nodus` };
}

// Chat del cliente con el equipo de Captive. Abrirlo marca como leídos los mensajes de Captive.
interface ChatCaptivePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ChatCaptivePage({ searchParams }: ChatCaptivePageProps) {
  const actor = await getUsuarioActual();
  if (!actor || (actor.rol !== "propietario" && actor.rol !== "buscador")) notFound();
  const resultado = await obtenerChatDelCliente(actor);
  if (!resultado.ok) notFound();
  const m = (await obtenerTextos()).t.panel.mensajes;

  // Si llegó desde "¿No encontraste tu espacio?", el cuadro de texto arranca con un borrador (la
  // persona lo revisa y lo envía; nada se manda solo).
  const query = await searchParams;
  const busqueda = typeof query.busqueda === "string" ? query.busqueda : undefined;
  let borrador: string | undefined;
  if (busqueda) {
    const filtros = leerBusqueda((clave) => new URLSearchParams(busqueda).get(clave) ?? undefined);
    borrador =
      contarFiltrosActivos(filtros.filtros) > 0
        ? m.borradorBusqueda(describirBusqueda(filtros.filtros))
        : m.borradorAyuda;
  } else if (query.ayuda === "1") {
    borrador = m.borradorAyuda;
  }

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4">
        {/* Al propietario se le oculta "Mensajes": llega aquí directo desde el menú de su cuenta. */}
        {actor.rol === "buscador" || MENSAJES_VISIBLE_PARA_PROPIETARIO ? (
          <Link
            href="/mensajes"
            className="flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
            {m.titulo}
          </Link>
        ) : null}

        <header className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeadsetIcon className="size-6" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="truncate font-display text-lg font-bold text-foreground">
              {m.captiveNombre}
            </h1>
            <p className="text-xs text-muted-foreground">{m.captiveDescripcion}</p>
          </div>
        </header>

        <ChatThread
          endpoint="/api/v1/captive-chat"
          vacio={m.captiveVacio}
          textoInicial={borrador}
          mensajes={resultado.data.map((mensaje) => ({
            id: mensaje.id,
            texto: mensaje.texto,
            mio: mensaje.mio,
            createdAt: mensaje.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
