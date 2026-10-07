"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { BrokerPromoBanner } from "./broker-promo-banner";
import type { PropertyListingData } from "./property-listing-card";
import { PropertyListingCard } from "./property-listing-card";
import { type FiltroPublicacion, PropertyListingFilters } from "./property-listing-filters";

interface MyListingsPageProps {
  propiedades: PropertyListingData[];
  isBroker: boolean;
}

export function MyListingsPage({ propiedades, isBroker }: MyListingsPageProps) {
  const p = useIdioma().t.panel.publicaciones;
  const [filtro, setFiltro] = useState<FiltroPublicacion>("todas");

  const conteos = useMemo(
    () => ({
      todas: propiedades.length,
      pendiente: propiedades.filter((p) => p.estadoPublicacion === "pendiente").length,
      publicada: propiedades.filter((p) => p.estadoPublicacion === "publicada").length,
      rechazada: propiedades.filter((p) => p.estadoPublicacion === "rechazada").length,
    }),
    [propiedades],
  );

  const visibles =
    filtro === "todas" ? propiedades : propiedades.filter((p) => p.estadoPublicacion === filtro);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-7 px-4">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[26px] font-bold text-foreground">{p.titulo}</h1>
          <p className="text-sm text-muted-foreground">{p.descripcion}</p>
        </div>
        <Link
          href="/propiedades/nueva"
          className="flex h-[46px] items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md motion-reduce:transition-none"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {p.publicarEspacio}
        </Link>
      </div>

      <BrokerPromoBanner isBroker={isBroker} />

      {propiedades.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-10">
          <p className="text-sm text-muted-foreground">{p.sinPropiedades}</p>
          <Link
            href="/propiedades/nueva"
            className="flex h-[46px] items-center rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground hover:bg-accent/90"
          >
            {p.publicarPropiedad}
          </Link>
        </div>
      ) : (
        <>
          <PropertyListingFilters filtro={filtro} onCambiarFiltro={setFiltro} conteos={conteos} />

          {visibles.length > 0 ? (
            <div className="flex flex-col gap-4">
              {visibles.map((propiedad) => (
                <PropertyListingCard key={propiedad.id} propiedad={propiedad} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-5 py-14 text-center text-muted-foreground">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 21h18" />
                <path d="M5 21V7l7-4 7 4v14" />
                <path d="M9 21v-6h6v6" />
              </svg>
              <span className="text-sm">{p.sinCategoria}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
