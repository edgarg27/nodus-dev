import { HeartIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FavoriteButton } from "@/components/properties/favorite-button";
import { Button } from "@/components/ui/button";
import {
  ETIQUETA_MODALIDAD,
  ETIQUETA_TIPO,
  extraerDetalles,
  formatearPrecio,
  resumenDetalles,
} from "@/lib/property-details";
import { getUsuarioActual } from "@/server/auth/session";
import { listarFavoritos } from "@/server/favorites/favorites";

export const metadata: Metadata = { title: "Mis favoritos — Captive by Nodus" };

export default async function FavoritosPage() {
  const actor = await getUsuarioActual();
  if (!actor) redirect("/sign-in?next=/favoritos");

  const favoritos = await listarFavoritos(actor.id);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text">Mis favoritos</h1>
        <p className="text-sm text-text-muted">
          Los espacios que guardaste. Si uno deja de estar publicado, desaparece de aquí.
        </p>
      </div>

      {favoritos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-8">
          <HeartIcon className="size-8 text-text-muted" aria-hidden="true" />
          <p className="text-sm text-text-muted">
            Aún no tienes favoritos. Toca el corazón en cualquier espacio para guardarlo.
          </p>
          <Button asChild>
            <Link href="/buscar">Buscar espacios</Link>
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
                      {ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo} ·{" "}
                      {ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad}
                    </span>
                    <span className="font-display text-lg font-bold text-text">
                      {formatearPrecio(detalles, propiedad.modalidad)}
                    </span>
                    <span className="text-sm text-text">{propiedad.direccion}</span>
                    <span className="text-[13px] text-text-muted">
                      {resumenDetalles(detalles, propiedad.tipo).join(" · ")}
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
