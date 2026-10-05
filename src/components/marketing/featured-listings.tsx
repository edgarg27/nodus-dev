import Link from "next/link";
import { extraerDetalles, formatearPrecio } from "@/lib/property-details";
import type { PropiedadDestacada } from "@/server/properties/queries";
import { Reveal } from "./reveal";

const ETIQUETAS_TIPO: Record<string, string> = {
  nave_industrial: "Nave industrial",
  oficina: "Oficina",
  local_comercial: "Local comercial",
};

const ETIQUETAS_MODALIDAD: Record<string, string> = {
  renta: "Renta",
  venta: "Venta",
  desde_cero: "Proyecto desde cero",
};

function PropertyIcon({ tipo }: { tipo: string }) {
  if (tipo === "oficina") {
    return (
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (tipo === "local_comercial") {
    return (
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="9" width="18" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 21V10l7-5 7 5v11" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 21v-7h6v7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

interface FeaturedListingsProps {
  propiedades: PropiedadDestacada[];
}

export function FeaturedListings({ propiedades }: FeaturedListingsProps) {
  if (propiedades.length === 0) return null;

  return (
    <section id="listados" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-xl flex-col gap-3">
          <span className="text-[13px] font-bold tracking-wide text-primary uppercase">
            Espacios destacados
          </span>
          <h2 className="text-[34px] leading-tight font-bold text-foreground">
            Naves, oficinas y locales listos para tu próxima etapa
          </h2>
        </div>
        <Link
          href="/buscar"
          className="flex items-center gap-1.5 text-[15px] font-semibold whitespace-nowrap text-foreground"
        >
          Ver todos los espacios
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </Reveal>

      <div className="mt-11 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {propiedades.map((propiedad, indice) => (
          <Reveal key={propiedad.id} delayMs={indice * 90}>
            <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(11,30,61,0.15)]">
              <div className="relative flex h-[170px] items-center justify-center bg-primary text-primary-foreground/40">
                {propiedad.foto ? (
                  // biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático
                  <img
                    src={propiedad.foto.storageUrl}
                    alt={propiedad.direccion}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PropertyIcon tipo={propiedad.tipo} />
                )}
                <span className="absolute top-3.5 left-3.5 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
                  {ETIQUETAS_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-5">
                <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                  {ETIQUETAS_TIPO[propiedad.tipo] ?? propiedad.tipo}
                </span>
                <h3 className="text-lg font-semibold text-foreground">{propiedad.direccion}</h3>
                <p className="text-sm text-muted-foreground">{propiedad.ciudad}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-display text-[17px] font-bold text-foreground">
                    {formatearPrecio(extraerDetalles(propiedad), propiedad.modalidad)}
                  </span>
                  <Link
                    href={`/espacios/${propiedad.id}`}
                    className="border-b-2 border-accent text-sm font-semibold text-foreground"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
