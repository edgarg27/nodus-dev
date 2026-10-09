import { ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatThread } from "@/components/messages/chat-thread";
import { iniciales } from "@/lib/initials";
import { getUsuarioActual } from "@/server/auth/session";
import { esUuid } from "@/server/http/envelope";
import { obtenerTextos } from "@/server/i18n";
import { clienteDelChat, obtenerChatParaCaptive } from "@/server/messages/captive";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.mensajes.metaTitulo };
}

interface AdminChatPageProps {
  params: Promise<{ id: string }>;
}

// Conversación de un cliente con Captive, a pantalla completa. Abrirla marca como leídos los
// mensajes del cliente.
export default async function AdminChatPage({ params }: AdminChatPageProps) {
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const [{ t }, actor] = await Promise.all([obtenerTextos(), getUsuarioActual()]);
  const cliente = await clienteDelChat(actor, id);
  if (!cliente) notFound();
  const mensajes = (await obtenerChatParaCaptive(actor, id)) ?? [];
  const textos = t.admin.mensajes;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <Link
        href="/admin/mensajes"
        className="flex w-fit items-center gap-1 text-sm font-semibold text-text-muted hover:text-primary"
      >
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
        {textos.titulo}
      </Link>

      <header className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">
          {iniciales(cliente.nombre)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="truncate font-display text-lg font-bold text-text">{cliente.nombre}</h1>
          <span className="truncate text-xs text-text-muted">{cliente.email}</span>
        </div>
        <Link
          href={`/admin/clientes/${id}`}
          className="shrink-0 text-sm font-semibold text-text underline-offset-4 hover:text-primary hover:underline"
        >
          {textos.verCliente}
        </Link>
      </header>

      <ChatThread
        endpoint={`/api/v1/admin/clientes/${id}/mensajes`}
        mensajes={mensajes.map((mensaje) => ({
          id: mensaje.id,
          texto: mensaje.texto,
          mio: mensaje.mio,
          autor: mensaje.autor,
          createdAt: mensaje.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
