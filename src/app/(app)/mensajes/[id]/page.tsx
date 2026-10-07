import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatThread } from "@/components/messages/chat-thread";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { esUuid } from "@/server/http/envelope";
import { obtenerTextos } from "@/server/i18n";
import { obtenerConversacion } from "@/server/messages/conversations";

interface ConversacionPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversacionPage({ params }: ConversacionPageProps) {
  const { id } = await params;
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor || !esUuid(id)) notFound();

  // Abrirla marca como leídos los mensajes del otro participante.
  const resultado = await obtenerConversacion(actor, id);
  if (!resultado.ok) notFound();
  const conversacion = resultado.data;
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
          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/80 to-primary">
            {conversacion.propiedad.fotoUrl ? (
              // biome-ignore lint/performance/noImgElement: foto subida por el oferente
              <img
                src={conversacion.propiedad.fotoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="truncate font-display text-lg font-bold text-foreground">
              {conversacion.otro.nombre || m.oferente}
            </h1>
            <Link
              href={`/espacios/${conversacion.propiedad.id}`}
              className="truncate text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {conversacion.propiedad.titulo ?? conversacion.propiedad.direccion}
            </Link>
          </div>
        </header>

        <ChatThread
          conversacionId={conversacion.id}
          mensajes={conversacion.mensajes.map((mensaje) => ({
            ...mensaje,
            createdAt: mensaje.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
