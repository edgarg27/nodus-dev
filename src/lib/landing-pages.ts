import { env } from "./env.ts";
import type { FiltrosBusqueda } from "./search-params.ts";

// Páginas de aterrizaje para Google: /<operación>/<tipo>[/<lugar>], por ejemplo
// /renta/naves-industriales/san-luis-potosi. Cada combinación es una búsqueda fija con su propio
// título, texto y liga canónica. Solo existen las combinaciones de estas listas (el resto da 404).

export const MODALIDADES_LANDING = [
  { slug: "renta", valor: "renta", texto: "en renta" },
  { slug: "venta", valor: "venta", texto: "en venta" },
  { slug: "proyecto-desde-cero", valor: "desde_cero", texto: "como proyecto desde cero" },
] as const;

export const TIPOS_LANDING = [
  {
    slug: "naves-industriales",
    valor: "nave_industrial",
    plural: "Naves industriales",
    singular: "nave industrial",
  },
  { slug: "oficinas", valor: "oficina", plural: "Oficinas", singular: "oficina" },
  {
    slug: "locales-comerciales",
    valor: "local_comercial",
    plural: "Locales comerciales",
    singular: "local comercial",
  },
] as const;

export const LUGARES_LANDING = [
  { slug: "san-luis-potosi", valor: "SLP", nombre: "San Luis Potosí" },
  { slug: "aguascalientes", valor: "Aguascalientes", nombre: "Aguascalientes" },
  { slug: "leon", valor: "Leon", nombre: "León" },
] as const;

type Modalidad = (typeof MODALIDADES_LANDING)[number];
type Tipo = (typeof TIPOS_LANDING)[number];
type Lugar = (typeof LUGARES_LANDING)[number];

export interface Landing {
  modalidad: Modalidad;
  tipo: Tipo;
  lugar: Lugar | null;
  ruta: string;
  titulo: string;
  descripcion: string;
  filtros: FiltrosBusqueda;
}

export function rutaLanding(modalidad: string, tipo: string, lugar?: string | null): string {
  return lugar ? `/${modalidad}/${tipo}/${lugar}` : `/${modalidad}/${tipo}`;
}

export function resolverLanding(
  modalidadSlug: string,
  tipoSlug: string,
  lugarSlug?: string,
): Landing | null {
  const modalidad = MODALIDADES_LANDING.find((m) => m.slug === modalidadSlug);
  const tipo = TIPOS_LANDING.find((t) => t.slug === tipoSlug);
  const lugar = lugarSlug ? LUGARES_LANDING.find((l) => l.slug === lugarSlug) : null;
  if (!modalidad || !tipo || lugar === undefined) return null;

  const donde = lugar ? ` en ${lugar.nombre}` : "";
  const titulo = `${tipo.plural} ${modalidad.texto}${donde}`;
  const descripcion = lugar
    ? `Encuentra ${tipo.plural.toLowerCase()} ${modalidad.texto} en ${lugar.nombre}: precios, metros cuadrados, fotos y ubicación. Contacta directo al oferente en Captive by Nodus.`
    : `${tipo.plural} ${modalidad.texto} en San Luis Potosí, Aguascalientes y León: precios, metros cuadrados, fotos y ubicación en Captive by Nodus.`;

  return {
    modalidad,
    tipo,
    lugar,
    ruta: rutaLanding(modalidad.slug, tipo.slug, lugar?.slug),
    titulo,
    descripcion,
    filtros: {
      modalidad: modalidad.valor,
      tipo: tipo.valor,
      ...(lugar ? { estado: lugar.valor } : {}),
    },
  };
}

// Todas las combinaciones (sin lugar y con cada lugar), para generateStaticParams y el sitemap.
export function todasLasLandings(): Landing[] {
  const landings: Landing[] = [];
  for (const modalidad of MODALIDADES_LANDING) {
    for (const tipo of TIPOS_LANDING) {
      for (const lugar of [null, ...LUGARES_LANDING]) {
        const landing = resolverLanding(modalidad.slug, tipo.slug, lugar?.slug);
        if (landing) landings.push(landing);
      }
    }
  }
  return landings;
}

// URL base pública del sitio (metadata, sitemap y robots). En local, localhost.
export function urlDelSitio(): string {
  return (env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
