import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SearchFilters } from "@/components/properties/search-filters";
import type { SearchResultProperty } from "@/components/properties/search-results";
import { SearchResults } from "@/components/properties/search-results";
import { SortSelect } from "@/components/properties/sort-select";
import { buscarPropiedadesPublicas, contarPropiedadesPublicas } from "@/server/properties/queries";

const MODALIDADES = ["renta", "venta", "desde_cero"] as const;
const TIPOS = ["nave_industrial", "oficina", "local_comercial"] as const;
const ESTADOS = ["SLP", "Aguascalientes", "Leon"] as const;
const ORDENES = ["relevancia", "recientes"] as const;

function filtroValido<T extends string>(
  valor: string | undefined,
  permitidos: readonly T[],
): T | undefined {
  return permitidos.includes(valor as T) ? (valor as T) : undefined;
}

interface BuscarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const params = await searchParams;
  const leer = (clave: string) => {
    const valor = params[clave];
    return typeof valor === "string" ? valor : undefined;
  };

  const financiamiento = filtroValido(leer("financiamiento"), ["true", "false"] as const);
  const estado = filtroValido(leer("estado"), ESTADOS);

  const filtros = {
    modalidad: filtroValido(leer("modalidad"), MODALIDADES),
    tipo: filtroValido(leer("tipo"), TIPOS),
    estado,
    ciudad: leer("ciudad"),
    financiamiento,
    aceptaFinanciamiento: financiamiento === undefined ? undefined : financiamiento === "true",
  };
  const orden = filtroValido(leer("orden"), ORDENES) ?? "relevancia";
  const initial = { ...filtros, orden };

  const [resultado, total] = await Promise.all([
    buscarPropiedadesPublicas(filtros, { orden }),
    contarPropiedadesPublicas(filtros),
  ]);

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
              <SortSelect initial={initial} />
              <SearchFilters initial={initial} />
            </div>
          </div>

          <SearchResults
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
