import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CaptiveContactCard } from "@/components/inicio-cliente/captive-contact-card";
import { ClientRequests } from "@/components/inicio-cliente/client-requests";
import { FavoritesPreview } from "@/components/inicio-cliente/favorites-preview";
import { SavedSearchList } from "@/components/properties/saved-search-list";
import { destinoPorRol } from "@/server/auth/redirigir-con-sesion";
import { getUsuarioActual } from "@/server/auth/session";
import { listarSolicitudesDelCliente } from "@/server/contact-requests/del-cliente";
import { listarFavoritos } from "@/server/favorites/favorites";
import { obtenerTextos } from "@/server/i18n";
import { resumenChatDelCliente } from "@/server/messages/captive";
import { listarBusquedasGuardadas } from "@/server/saved-searches/saved-searches";

// Favoritos y búsquedas que se muestran; el resto está en sus páginas.
const EN_INICIO = 3;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.panel.inicioCliente.metaTitulo };
}

// Pantalla de inicio del cliente (buscador): en qué van sus solicitudes de informes, sus favoritos y
// búsquedas guardadas y el contacto con el equipo Captive. Los demás roles tienen su propio inicio.
export default async function InicioClientePage() {
  const actor = await getUsuarioActual();
  if (!actor) redirect("/sign-in?next=/inicio");
  if (actor.rol !== "buscador") redirect(destinoPorRol(actor.rol));

  const [{ idioma, t }, solicitudes, favoritos, busquedas, chat] = await Promise.all([
    obtenerTextos(),
    listarSolicitudesDelCliente(actor.id),
    listarFavoritos(actor.id),
    listarBusquedasGuardadas(actor.id, EN_INICIO),
    resumenChatDelCliente(actor.id),
  ]);
  const i = t.panel.inicioCliente;

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[28px] font-bold text-eyebrow">
              {i.hola(actor.nombre)}
            </h1>
            <p className="text-sm text-muted-foreground">{i.subtitulo}</p>
          </div>
          <Link
            href="/buscar"
            className="flex h-[46px] items-center gap-2 rounded-lg bg-cta px-5 text-sm font-bold text-cta-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-cta/90 hover:shadow-md motion-reduce:transition-none"
          >
            <SearchIcon className="size-4" aria-hidden="true" />
            {i.buscar}
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ClientRequests solicitudes={solicitudes} idioma={idioma} />
          <CaptiveContactCard noLeidos={chat.noLeidos} idioma={idioma} />
        </div>

        <FavoritesPreview
          favoritos={favoritos.slice(0, EN_INICIO).map((favorito) => ({
            id: favorito.id,
            tipo: favorito.tipo,
            modalidad: favorito.modalidad,
            ciudad: favorito.ciudad,
            direccion: favorito.direccion,
            fotoUrl: favorito.fotoUrl,
          }))}
          idioma={idioma}
        />

        <section aria-labelledby="busquedas-titulo" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="busquedas-titulo" className="text-[15px] font-bold text-foreground">
              {i.busquedasTitulo}
            </h2>
            {busquedas.length > 0 ? (
              <Link
                href="/mis-busquedas"
                className="text-sm font-semibold text-ink hover:underline"
              >
                {i.verTodas}
              </Link>
            ) : null}
          </div>
          {busquedas.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              {i.busquedasVacio}
            </p>
          ) : (
            <SavedSearchList
              busquedas={busquedas.map((busqueda) => ({
                id: busqueda.id,
                nombre: busqueda.nombre,
                consulta: busqueda.consulta,
                total: busqueda.total,
                nuevos: busqueda.nuevos,
              }))}
            />
          )}
        </section>
      </div>
    </main>
  );
}
