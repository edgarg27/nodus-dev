import { notFound } from "next/navigation";
import { MyListingsPage } from "@/components/properties/my-listings-page";
import type { EstadoPublicacion } from "@/components/properties/status-badge";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { listarPropiedadesDelDueno } from "@/server/properties/queries";

export default async function PropiedadesPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const propiedades = await listarPropiedadesDelDueno(actor.id);

  return (
    <main className="w-full py-10">
      <MyListingsPage
        isBroker={actor.isBroker}
        propiedades={propiedades.map((propiedad) => ({
          id: propiedad.id,
          direccion: propiedad.direccion,
          tipo: propiedad.tipo,
          modalidad: propiedad.modalidad,
          estado: propiedad.estado,
          ciudad: propiedad.ciudad,
          estadoPublicacion: propiedad.estadoPublicacion as EstadoPublicacion,
          motivoRechazo: propiedad.motivoRechazo,
          createdAt: propiedad.createdAt.toISOString(),
          revisadaEn: propiedad.revisadaEn?.toISOString() ?? null,
          fotoUrl: propiedad.foto?.storageUrl ?? null,
        }))}
      />
    </main>
  );
}
