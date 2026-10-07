import { ChevronRightIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { AgencyByline } from "@/components/agency/agency-byline";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PropertyContactPanel } from "@/components/properties/property-contact-panel";
import { PropertyDetailMap } from "@/components/properties/property-detail-map";
import { PropertyGallery } from "@/components/properties/property-gallery";
import {
  ETIQUETA_ESTADO,
  especificaciones,
  extraerDetalles,
  formatearPrecio,
  resumenDetalles,
  tituloEspacio,
} from "@/lib/property-details";
import { obtenerIdentidadPublica } from "@/server/agency/queries";
import { getUsuarioActual } from "@/server/auth/session";
import { idsFavoritos } from "@/server/favorites/favorites";
import { obtenerTextos } from "@/server/i18n";
import { registrarVisita } from "@/server/metrics/record";
import {
  listarPropiedadesSimilares,
  obtenerFotosDePropiedad,
  obtenerPropiedadPublicaPorId,
} from "@/server/properties/queries";
import { ipDeEncabezados } from "@/server/rate-limit/check";

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
  const { idioma, t } = await obtenerTextos();
  if (!espacio) return { title: t.ficha.noEncontrado };

  const { propiedad, fotos } = espacio;
  const titulo =
    propiedad.titulo ??
    tituloEspacio(propiedad.tipo, propiedad.modalidad, propiedad.ciudad, idioma);
  const precio = formatearPrecio(extraerDetalles(propiedad), propiedad.modalidad, idioma);
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
  const { idioma, t } = await obtenerTextos();
  const titulo =
    propiedad.titulo ??
    tituloEspacio(propiedad.tipo, propiedad.modalidad, propiedad.ciudad, idioma);
  const precio = formatearPrecio(detalles, propiedad.modalidad, idioma);
  const filas = [
    { etiqueta: t.ficha.tipo, valor: t.etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo },
    {
      etiqueta: t.ficha.operacion,
      valor: t.etiquetas.modalidad[propiedad.modalidad] ?? propiedad.modalidad,
    },
    ...especificaciones(detalles, propiedad.tipo, idioma),
    {
      etiqueta: t.ficha.financiamiento,
      valor: propiedad.aceptaFinanciamiento ? t.ficha.disponible : t.ficha.no,
    },
  ];
  const actor = await getUsuarioActual();
  // La visita se cuenta después de responder, para no retrasar la ficha.
  const ip = ipDeEncabezados(await headers());
  after(() =>
    registrarVisita({
      propiedadId: propiedad.id,
      oferenteId: propiedad.oferenteId,
      actorId: actor?.id ?? null,
      ip,
    }),
  );
  const [similares, favoritos, agencia] = await Promise.all([
    listarPropiedadesSimilares(propiedad),
    actor ? idsFavoritos(actor.id, [propiedad.id]) : Promise.resolve([]),
    obtenerIdentidadPublica(propiedad.oferenteId),
  ]);
  const esFavorito = favoritos.length > 0;
  const estadoEtiqueta = ETIQUETA_ESTADO[propiedad.estado] ?? propiedad.estado;
  const lugar =
    propiedad.ciudad === estadoEtiqueta
      ? propiedad.ciudad
      : `${propiedad.ciudad}, ${estadoEtiqueta}`;
  const busquedaRelacionada = new URLSearchParams({
    modalidad: propiedad.modalidad,
    tipo: propiedad.tipo,
    estado: propiedad.estado,
  }).toString();

  return (
    <>
      <nav
        aria-label={t.resultados.migas}
        className="flex justify-center border-b border-border bg-background"
      >
        <ol className="flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-4 text-[13px] text-text-muted sm:px-6 lg:px-8">
          <li>
            <Link href="/" className="hover:text-text">
              {t.resultados.inicio}
            </Link>
            <ChevronRightIcon
              className="ml-2 inline size-3 text-text-muted/60"
              aria-hidden="true"
            />
          </li>
          <li>
            <Link href={`/buscar?${busquedaRelacionada}`} className="hover:text-text">
              {t.landing.titulo(
                t.etiquetas.tipoPlural[propiedad.tipo] ?? propiedad.tipo,
                t.etiquetas.operacion[propiedad.modalidad] ?? propiedad.modalidad,
                estadoEtiqueta,
              )}
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
                  {t.etiquetas.modalidad[propiedad.modalidad] ?? propiedad.modalidad}
                </span>
                <span className="text-xs font-semibold tracking-wide text-warning uppercase">
                  {t.etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo}
                </span>
              </div>
              <h1 className="text-[26px] leading-tight font-bold text-text sm:text-[32px]">
                {titulo}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
                <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
                {propiedad.direccion} · {lugar}
              </p>
              <AgencyByline
                nombre={agencia.nombre}
                esBroker={agencia.esBroker}
                etiquetaPublicadoPor={t.ficha.publicadoPor}
                etiquetaBroker={t.ficha.brokerVerificado}
              />
              <ul className="flex flex-wrap gap-1.5 pt-1" aria-label={t.ficha.datosPrincipales}>
                {resumenDetalles(detalles, propiedad.tipo, idioma).map((etiqueta) => (
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
                tipo={propiedad.tipo}
                aceptaFinanciamiento={propiedad.aceptaFinanciamiento}
                haySimilares={similares.length > 0}
              />
            </div>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-text">{t.ficha.especificaciones}</h2>
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
              <h2 className="text-lg font-bold text-text">{t.ficha.descripcion}</h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-text">
                {propiedad.descripcion}
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-text">{t.ficha.ubicacion}</h2>
              <PropertyDetailMap
                id={propiedad.id}
                direccion={propiedad.direccion}
                lat={Number(propiedad.lat)}
                lng={Number(propiedad.lng)}
              />
            </section>

            {similares.length > 0 ? (
              <section id="similares" className="flex scroll-mt-24 flex-col gap-4">
                <h2 className="text-lg font-bold text-text">{t.ficha.similares}</h2>
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
                            {formatearPrecio(extraerDetalles(similar), similar.modalidad, idioma)}
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
                tipo={propiedad.tipo}
                aceptaFinanciamiento={propiedad.aceptaFinanciamiento}
                haySimilares={similares.length > 0}
              />
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter idioma={idioma} />
    </>
  );
}
