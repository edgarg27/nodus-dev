import { ChevronRightIcon, SlidersHorizontalIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SaveSearchButton } from "@/components/properties/save-search-button";
import { SearchResults } from "@/components/properties/search-results";
import { SortSelect } from "@/components/properties/sort-select";
import {
  type Landing,
  LUGARES_LANDING,
  MODALIDADES_LANDING,
  rutaLanding,
  TIPOS_LANDING,
} from "@/lib/landing-pages";
import { cargarResultados } from "./cargar-resultados";

export function metadataDeLanding(landing: Landing): Metadata {
  const titulo = `${landing.titulo} — Captive by Nodus`;
  return {
    title: titulo,
    description: landing.descripcion,
    alternates: { canonical: landing.ruta },
    openGraph: { title: titulo, description: landing.descripcion, url: landing.ruta },
  };
}

// Página de aterrizaje por tipo, operación y lugar: los mismos resultados de /buscar con un
// título y texto propios para Google, y ligas a búsquedas relacionadas. Refinar o reordenar lleva
// a /buscar con estos filtros ya puestos.
export async function LandingView({ landing }: { landing: Landing }) {
  const datos = await cargarResultados(landing.filtros, "relevancia");
  const { modalidad, tipo, lugar } = landing;

  const relacionadas = [
    ...LUGARES_LANDING.filter((otro) => otro.slug !== lugar?.slug).map((otro) => ({
      ruta: rutaLanding(modalidad.slug, tipo.slug, otro.slug),
      texto: `${tipo.plural} ${modalidad.texto} en ${otro.nombre}`,
    })),
    ...TIPOS_LANDING.filter((otro) => otro.slug !== tipo.slug).map((otro) => ({
      ruta: rutaLanding(modalidad.slug, otro.slug, lugar?.slug),
      texto: `${otro.plural} ${modalidad.texto}${lugar ? ` en ${lugar.nombre}` : ""}`,
    })),
    ...MODALIDADES_LANDING.filter((otra) => otra.slug !== modalidad.slug).map((otra) => ({
      ruta: rutaLanding(otra.slug, tipo.slug, lugar?.slug),
      texto: `${tipo.plural} ${otra.texto}${lugar ? ` en ${lugar.nombre}` : ""}`,
    })),
  ];

  return (
    <>
      <nav
        aria-label="Migas de pan"
        className="flex justify-center border-b border-border bg-background"
      >
        <ol className="flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-4 text-[13px] text-text-muted sm:px-6 lg:px-8">
          <li>
            <Link href="/" className="hover:text-text">
              Inicio
            </Link>
            <ChevronRightIcon
              className="ml-2 inline size-3 text-text-muted/60"
              aria-hidden="true"
            />
          </li>
          {lugar ? (
            <li>
              <Link href={rutaLanding(modalidad.slug, tipo.slug)} className="hover:text-text">
                {tipo.plural} {modalidad.texto}
              </Link>
              <ChevronRightIcon
                className="ml-2 inline size-3 text-text-muted/60"
                aria-hidden="true"
              />
            </li>
          ) : null}
          <li aria-current="page" className="font-semibold text-text">
            {lugar ? lugar.nombre : `${tipo.plural} ${modalidad.texto}`}
          </li>
        </ol>
      </nav>

      <main className="flex justify-center bg-background">
        <div className="flex w-full max-w-7xl flex-col gap-7 px-4 py-7 pb-24 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-2">
            <h1 className="text-[26px] leading-tight font-bold text-text sm:text-[34px]">
              {landing.titulo}
            </h1>
            <p className="max-w-3xl text-[15px] text-text-muted">{landing.descripcion}</p>
          </header>

          <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3 sm:px-5 sm:py-4">
            <p className="text-base font-bold text-text sm:text-xl">
              {datos.total} {datos.total === 1 ? "espacio encontrado" : "espacios encontrados"}
            </p>
            <div className="flex items-center gap-3">
              <SaveSearchButton
                consulta={datos.consulta}
                guardadaInicial={datos.guardada}
                autenticado={datos.autenticado}
              />
              <SortSelect filtros={landing.filtros} orden="relevancia" />
              <Link
                href={`/buscar?${datos.consulta}`}
                className="flex h-[42px] items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
              >
                <SlidersHorizontalIcon className="size-[17px]" aria-hidden="true" />
                <span className="hidden sm:inline">Refinar búsqueda</span>
              </Link>
            </div>
          </div>

          <SearchResults
            key={datos.consulta}
            favoritos={datos.favoritos}
            autenticado={datos.autenticado}
            propiedadesIniciales={datos.propiedades}
            hasMoreInicial={datos.hasMore}
            nextCursorInicial={datos.nextCursor}
            filtros={landing.filtros}
            orden="relevancia"
          />

          <section className="flex flex-col gap-3 border-t border-border pt-7">
            <h2 className="text-lg font-bold text-text">Búsquedas relacionadas</h2>
            <ul className="flex flex-wrap gap-2">
              {relacionadas.map((relacionada) => (
                <li key={relacionada.ruta}>
                  <Link
                    href={relacionada.ruta}
                    className="inline-block rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-text transition-colors hover:border-primary hover:text-primary"
                  >
                    {relacionada.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
