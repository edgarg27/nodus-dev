import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MyListingsPage } from "@/components/properties/my-listings-page";
import type { EstadoPublicacion } from "@/components/properties/status-badge";
import { leerMisPropiedades } from "@/lib/mis-propiedades-params";
import { extraerDetalles, formatearPrecio } from "@/lib/property-details";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";
import { listarMisPropiedades } from "@/server/properties/queries";

interface PropiedadesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.panel.tabla.metaTitulo };
}

export default async function PropiedadesPage({ searchParams }: PropiedadesPageProps) {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const { idioma } = await obtenerTextos();
  const query = await searchParams;
  const params = leerMisPropiedades((clave) => {
    const valor = query[clave];
    return typeof valor === "string" ? valor : undefined;
  });

  const listado = await listarMisPropiedades(actor.id, {
    q: params.q,
    estadoPublicacion: params.estado === "todas" ? undefined : params.estado,
    orden: params.orden,
    pagina: params.pagina,
  });

  return (
    <main className="w-full py-10">
      <MyListingsPage
        isBroker={actor.isBroker}
        params={params}
        conteos={listado.conteos}
        total={listado.total}
        porPagina={listado.porPagina ?? listado.total}
        propiedades={listado.filas.map((propiedad) => ({
          id: propiedad.id,
          titulo: propiedad.titulo,
          referencia: propiedad.referencia,
          direccion: propiedad.direccion,
          lugar: [propiedad.ciudad, propiedad.estado].filter(Boolean).join(", "),
          tipo: propiedad.tipo,
          modalidad: propiedad.modalidad,
          precio: formatearPrecio(extraerDetalles(propiedad), propiedad.modalidad, idioma),
          estadoPublicacion: propiedad.estadoPublicacion as EstadoPublicacion,
          motivoRechazo: propiedad.motivoRechazo,
          compartidaEnRed: propiedad.compartidaEnRed,
          createdAt: propiedad.createdAt.toISOString(),
          fotoUrl: propiedad.foto?.storageUrl ?? null,
          impresiones: propiedad.metricas.impresiones,
          visitas: propiedad.metricas.visitas,
          solicitudes: propiedad.metricas.solicitudes,
        }))}
      />
    </main>
  );
}
