import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { listarConversaciones } from "@/server/messages/conversations";

const formateadorFecha = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
});

export default async function MensajesPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const resultado = await listarConversaciones(actor);
  const conversaciones = resultado.ok ? resultado.data : [];

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-7 px-4">
        <header className="flex flex-col gap-1.5">
          <h1 className="font-display text-[26px] font-bold text-foreground">Mensajes</h1>
          <p className="text-sm text-muted-foreground">
            Conversaciones con otros oferentes sobre propiedades de la Red inmobiliaria.
          </p>
        </header>

        {conversaciones.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-5 py-14 text-center text-muted-foreground">
            <span className="text-sm">Aún no tienes conversaciones.</span>
            <Link
              href="/red"
              className="flex h-[46px] items-center rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground hover:bg-accent/90"
            >
              Explorar la red
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {conversaciones.map((conversacion) => (
              <li key={conversacion.id}>
                <Link
                  href={`/mensajes/${conversacion.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
                >
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
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold text-foreground">
                      {conversacion.otro.nombre || "Oferente"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {conversacion.propiedad.titulo ?? conversacion.propiedad.direccion}
                    </span>
                    {conversacion.ultimoMensaje ? (
                      <span className="truncate text-sm text-muted-foreground">
                        {conversacion.ultimoMensaje.texto}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {conversacion.ultimoMensaje ? (
                      <span className="text-xs text-muted-foreground">
                        {formateadorFecha.format(conversacion.ultimoMensaje.createdAt)}
                      </span>
                    ) : null}
                    {conversacion.noLeidos > 0 ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                        {conversacion.noLeidos}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
