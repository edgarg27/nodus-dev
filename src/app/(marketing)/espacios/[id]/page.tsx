import { ChevronRightIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PropertyContactPanel } from "@/components/properties/property-contact-panel";
import { PropertyDetailMap } from "@/components/properties/property-detail-map";
import { PropertyGallery } from "@/components/properties/property-gallery";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_MODALIDAD,
  ETIQUETA_TIPO,
  especificaciones,
  extraerDetalles,
  formatearPrecio,
  resumenDetalles,
  tituloEspacio,
} from "@/lib/property-details";
import { getUsuarioActual } from "@/server/auth/session";
import { idsFavoritos } from "@/server/favorites/favorites";
import {
  listarPropiedadesSimilares,
  obtenerFotosDePropiedad,
  obtenerPropiedadPublicaPorId,
} from "@/server/properties/queries";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface EspacioPageProps {
  params: Promise<{ id: string }>;
}

// Solo espacios activos y publicados; cualquier otro id responde 404 (no confirma que exista).
// `cache` evita consultar dos veces entre generateMetadata y la página.
const cargarEspacio = cache(async (id: string) => {
  if (!UUID_REGEX.test(id)) return null;
  const propiedad = await obtenerPropiedadPublicaPorId(id);
  if (!propiedad) return null;
  const fotos = await obtenerFotosDePropiedad(propiedad.id);
  return { propiedad, fotos };
});

export async function generateMetadata({ params }: EspacioPageProps): Promise<Metadata> {
  const { id } = await params;
  const espacio = await cargarEspacio(id);
  if (!espacio) return { title: "Espacio no encontrado — Captive by Nodus" };

  const { propiedad, fotos } = espacio;
  const titulo = tituloEspacio(propiedad.tipo, propiedad.modalidad, propiedad.ciudad);
  const precio = formatearPrecio(extraerDetalles(propiedad), propiedad.modalidad);
  const descripcion = `${precio}. ${propiedad.descripcion}`.slice(0, 160);
  return {
    title: `${titulo} — Captive by Nodus`,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      images: fotos[0] ? [{ url: fotos[0].storageUrl }] : undefined,
    },
  };
}

export default async function EspacioPage({ params }: EspacioPageProps) {
  const { id } = await params;
  const espacio = await cargarEspacio(id);
  if (!espacio) notFound();

  const { propiedad, fotos } = espacio;
  const detalles = extraerDetalles(propiedad);
  const titulo = tituloEspacio(propiedad.tipo, propiedad.modalidad, propiedad.ciudad);
  const precio = formatearPrecio(detalles, propiedad.modalidad);
  const filas = [
    { etiqueta: "Tipo", valor: ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo },
    {
      etiqueta: "Operación",
      valor: ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad,
    },
    ...especificaciones(detalles, propiedad.tipo),
    { etiqueta: "Financiamiento", valor: propiedad.aceptaFinanciamiento ? "Disponible" : "No" },
  ];
  const actor = await getUsuarioActual();
  const [similares, favoritos] = await Promise.all([
    listarPropiedadesSimilares(propiedad),
    actor ? idsFavoritos(actor.id, [propiedad.id]) : Promise.resolve([]),
  ]);
  const esFavorito = favoritos.length > 0;
  const estadoEtiqueta = ETIQUETA_ESTADO[propiedad.estado] ?? propiedad.estado;
  const lugar =
    propiedad.ciudad === estadoEtiqueta
      ? propiedad.ciudad
      : `${propiedad.ciudad}, ${estadoEtiqueta}`;
  const busquedaRelacionada = new URLSearchParams({
    tipo: propiedad.tipo,
    estado: propiedad.estado,
  }).toString();

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
          <li>
            <Link href={`/buscar?${busquedaRelacionada}`} className="hover:text-text">
              {ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo} en {estadoEtiqueta}
            </Link>
            <ChevronRightIcon
              className="ml-2 inline size-3 text-text-muted/60"
              aria-hidden="true"
            />
          </li>
          <li aria-current="page" className="font-semibold text-text">
            {propiedad.direccion}
          </li>
        </ol>
      </nav>

      <main className="flex justify-center bg-background">
        <div className="grid w-full max-w-7xl gap-8 px-4 py-8 pb-20 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div className="flex min-w-0 flex-col gap-8">
            <PropertyGallery fotos={fotos} tipo={propiedad.tipo} descripcionAlt={titulo} />

            <header className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                  {ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad}
                </span>
                <span className="text-xs font-semibold tracking-wide text-warning uppercase">
                  {ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo}
                </span>
              </div>
              <h1 className="text-[26px] leading-tight font-bold text-text sm:text-[32px]">
                {titulo}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
                <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
                {propiedad.direccion} · {lugar}
              </p>
              <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Datos principales">
                {resumenDetalles(detalles, propiedad.tipo).map((etiqueta) => (
                  <li
                    key={etiqueta}
                    className="rounded-full bg-surface px-3 py-1 text-[13px] font-medium text-text"
                  >
                    {etiqueta}
                  </li>
                ))}
              </ul>
            </header>

            <div className="lg:hidden">
              <PropertyContactPanel
                propiedadId={propiedad.id}
                precio={precio}
                titulo={titulo}
                favorito={esFavorito}
                autenticado={actor !== null}
              />
            </div>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-text">Especificaciones</h2>
              <dl className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-2">
                {filas.map((fila) => (
                  <div
                    key={fila.etiqueta}
                    className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 text-sm sm:odd:border-r"
                  >
                    <dt className="text-text-muted">{fila.etiqueta}</dt>
                    <dd className="font-semibold text-text">{fila.valor}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-text">Descripción</h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-text">
                {propiedad.descripcion}
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-text">Ubicación</h2>
              <PropertyDetailMap
                id={propiedad.id}
                direccion={propiedad.direccion}
                lat={Number(propiedad.lat)}
                lng={Number(propiedad.lng)}
              />
            </section>

            {similares.length > 0 ? (
              <section className="flex flex-col gap-4">
                <h2 className="text-lg font-bold text-text">Espacios similares</h2>
                <ul className="grid gap-4 sm:grid-cols-3">
                  {similares.map((similar) => (
                    <li key={similar.id}>
                      <Link
                        href={`/espacios/${similar.id}`}
                        className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="h-28 bg-gradient-to-br from-primary/70 to-primary">
                          {similar.foto ? (
                            // biome-ignore lint/performance/noImgElement: foto subida por el oferente
                            <img
                              src={similar.foto.storageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-1 p-3.5">
                          <span className="text-sm font-bold text-text">
                            {formatearPrecio(extraerDetalles(similar), similar.modalidad)}
                          </span>
                          <span className="line-clamp-2 text-[13px] text-text-muted">
                            {similar.direccion}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <PropertyContactPanel
                propiedadId={propiedad.id}
                precio={precio}
                titulo={titulo}
                favorito={esFavorito}
                autenticado={actor !== null}
              />
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
