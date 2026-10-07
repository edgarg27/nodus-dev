import { HeartIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FavoriteButton } from "@/components/properties/favorite-button";
import { Button } from "@/components/ui/button";
import { extraerDetalles, formatearPrecio, resumenDetalles } from "@/lib/property-details";
import { getUsuarioActual } from "@/server/auth/session";
import { listarFavoritos } from "@/server/favorites/favorites";
import { obtenerTextos } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.panel.favoritos.metaTitulo };
}

export default async function FavoritosPage() {
  const actor = await getUsuarioActual();
  if (!actor) redirect("/sign-in?next=/favoritos");

  const favoritos = await listarFavoritos(actor.id);
  const { idioma, t: textos } = await obtenerTextos();
  const t = textos.panel.favoritos;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text">{t.titulo}</h1>
        <p className="text-sm text-text-muted">{t.descripcion}</p>
      </div>

      {favoritos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-8">
          <HeartIcon className="size-8 text-text-muted" aria-hidden="true" />
          <p className="text-sm text-text-muted">{t.vacio}</p>
          <Button asChild>
            <Link href="/buscar">{t.buscar}</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favoritos.map((propiedad) => {
            const detalles = extraerDetalles(propiedad);
            return (
              <li
                key={propiedad.id}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <Link href={`/espacios/${propiedad.id}`} className="flex flex-col">
                  <div className="h-40 bg-gradient-to-br from-primary/70 to-primary">
                    {propiedad.fotoUrl ? (
                      // biome-ignore lint/performance/noImgElement: foto subida por el oferente
                      <img src={propiedad.fotoUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1.5 p-4">
                    <span className="text-[11px] font-semibold tracking-wide text-warning uppercase">
                      {textos.etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo} ·{" "}
                      {textos.etiquetas.modalidad[propiedad.modalidad] ?? propiedad.modalidad}
                    </span>
                    <span className="font-display text-lg font-bold text-text">
                      {formatearPrecio(detalles, propiedad.modalidad, idioma)}
                    </span>
                    <span className="text-sm text-text">{propiedad.direccion}</span>
                    <span className="text-[13px] text-text-muted">
                      {resumenDetalles(detalles, propiedad.tipo, idioma).join(" · ")}
                    </span>
                  </div>
                </Link>
                <div className="absolute top-3 right-3">
                  <FavoriteButton propiedadId={propiedad.id} inicial autenticado />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
