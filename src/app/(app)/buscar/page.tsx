import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SearchFilters } from "@/components/properties/search-filters";
import type { SearchResultProperty } from "@/components/properties/search-results";
import { SearchResults } from "@/components/properties/search-results";
import { SortSelect } from "@/components/properties/sort-select";
import { extraerDetalles } from "@/lib/property-details";
import { busquedaAParams, leerBusqueda } from "@/lib/search-params";
import {
  buscarPropiedadesPublicas,
  contarPropiedadesPublicas,
  obtenerPrimerasFotos,
} from "@/server/properties/queries";

interface BuscarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const params = await searchParams;
  const leer = (clave: string) => {
    const valor = params[clave];
    return typeof valor === "string" ? valor : undefined;
  };

  // Un parámetro inválido en la URL se ignora (la API, en cambio, responde 422).
  const { filtros, orden } = leerBusqueda(leer);
  const filtrosServidor = {
    ...filtros,
    aceptaFinanciamiento:
      filtros.financiamiento === undefined ? undefined : filtros.financiamiento === "true",
  };

  const [resultado, total] = await Promise.all([
    buscarPropiedadesPublicas(filtrosServidor, { orden }),
    contarPropiedadesPublicas(filtrosServidor),
  ]);
  const primerasFotos = await obtenerPrimerasFotos(resultado.data.map((fila) => fila.id));

  const propiedades: SearchResultProperty[] = resultado.data.map((fila) => ({
    id: fila.id,
    direccion: fila.direccion,
    tipo: fila.tipo,
    modalidad: fila.modalidad,
    estado: fila.estado,
    ciudad: fila.ciudad,
    descripcion: fila.descripcion,
    lat: Number(fila.lat),
    lng: Number(fila.lng),
    fotoUrl: primerasFotos.get(fila.id)?.storageUrl ?? null,
    ...extraerDetalles(fila),
  }));

  return (
    <>
      <div className="flex justify-center border-b border-border bg-background">
        <div className="flex w-full max-w-7xl items-center gap-2 px-4 py-4 text-[13px] text-text-muted sm:px-6 lg:px-8">
          <Link href="/" className="text-text-muted hover:text-text">
            Inicio
          </Link>
          <ChevronRightIcon className="size-3 text-text-muted/60" aria-hidden="true" />
          <span className="font-semibold text-text">Resultados de búsqueda</span>
        </div>
      </div>

      <main className="flex justify-center bg-background">
        <div className="flex w-full max-w-7xl flex-col gap-7 px-4 py-7 pb-24 sm:px-6 lg:px-8">
          <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3 sm:px-5 sm:py-4">
            <h1 className="text-base font-bold text-text sm:text-xl">
              {total} {total === 1 ? "espacio encontrado" : "espacios encontrados"}
            </h1>
            <div className="flex items-center gap-3">
              <SortSelect filtros={filtros} orden={orden} />
              <SearchFilters initial={{ ...filtros, orden }} />
            </div>
          </div>

          {/* La lista guarda sus filas en estado (para "Cargar más"); la `key` la reinicia cuando
              cambian los filtros o el orden sin recargar la página (p. ej. desde SortSelect). */}
          <SearchResults
            key={busquedaAParams(filtros, orden).toString()}
            propiedadesIniciales={propiedades}
            hasMoreInicial={resultado.hasMore}
            nextCursorInicial={resultado.nextCursor}
            filtros={filtros}
            orden={orden}
          />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
