import { ChevronLeftIcon, HeadsetIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatThread } from "@/components/messages/chat-thread";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";
import { obtenerChatDelCliente } from "@/server/messages/captive";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: `${t.panel.mensajes.captiveNombre} — Captive by Nodus` };
}

// Chat del cliente con el equipo de Captive. Abrirlo marca como leídos los mensajes de Captive.
export default async function ChatCaptivePage() {
  const actor = await getUsuarioActual();
  if (!actor || (actor.rol !== "oferente" && actor.rol !== "buscador")) notFound();
  const resultado = await obtenerChatDelCliente(actor);
  if (!resultado.ok) notFound();
  const m = (await obtenerTextos()).t.panel.mensajes;

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4">
        <Link
          href="/mensajes"
          className="flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
          {m.titulo}
        </Link>

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
