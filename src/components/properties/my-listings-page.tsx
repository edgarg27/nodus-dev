"use client";

import Link from "next/link";
import {
  type FiltroEstadoMisPropiedades,
  misPropiedadesAParams,
  type ParamsMisPropiedades,
} from "@/lib/mis-propiedades-params";
import { BrokerPromoBanner } from "./broker-promo-banner";
import { MyListingsTable, type PropiedadDeTabla } from "./my-listings-table";
import { MyListingsToolbar } from "./my-listings-toolbar";
import { PaginationBar } from "./pagination-bar";

interface MyListingsPageProps {
  propiedades: PropiedadDeTabla[];
  params: ParamsMisPropiedades;
  conteos: Record<FiltroEstadoMisPropiedades, number>;
  total: number;
  porPagina: number;
  isBroker: boolean;
}

export function MyListingsPage({
  propiedades,
  params,
  conteos,
  total,
  porPagina,
  isBroker,
}: MyListingsPageProps) {
  const sinPropiedades = conteos.todas === 0 && !params.q;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-4">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[26px] font-bold text-foreground">Propiedades</h1>
          <p className="text-sm text-muted-foreground">
            Tus espacios con su estado de revisión y sus resultados.
          </p>
        </div>
        <Link
          href="/propiedades/nueva"
          className="flex h-[46px] items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md motion-reduce:transition-none"
        >
          Publicar un espacio
        </Link>
      </div>

      <BrokerPromoBanner isBroker={isBroker} />

      {sinPropiedades ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-10">
          <p className="text-sm text-muted-foreground">Aún no tienes propiedades</p>
          <Link
            href="/propiedades/nueva"
            className="flex h-[46px] items-center rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground hover:bg-accent/90"
          >
            Publicar una propiedad
          </Link>
        </div>
      ) : (
        <>
          <MyListingsToolbar params={params} conteos={conteos} />

          {propiedades.length > 0 ? (
            <>
              {/* La `key` reinicia la selección al cambiar de página, búsqueda u orden. */}
              <MyListingsTable
                key={misPropiedadesAParams(params).toString()}
                propiedades={propiedades}
                params={params}
              />
              <PaginationBar
                pagina={params.pagina}
                porPagina={porPagina}
                total={total}
                hrefDe={(pagina) => {
                  const consulta = misPropiedadesAParams({ ...params, pagina }).toString();
                  return consulta ? `/propiedades?${consulta}` : "/propiedades";
                }}
              />
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-5 py-14 text-center text-muted-foreground">
              <span className="text-sm">No hay propiedades que coincidan con tu búsqueda.</span>
              <Link href="/propiedades" className="text-sm font-semibold text-primary underline">
                Borrar filtros
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
