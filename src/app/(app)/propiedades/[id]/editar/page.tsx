import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import type { EstadoPublicacion } from "@/components/properties/status-badge";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import {
  obtenerFotosDePropiedad,
  obtenerPropiedadDelDuenoPorId,
} from "@/server/properties/queries";

interface EditarPropiedadPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarPropiedadPage({ params }: EditarPropiedadPageProps) {
  const { id } = await params;
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const propiedad = await obtenerPropiedadDelDuenoPorId(actor.id, id);
  if (!propiedad) notFound();

  const fotos = await obtenerFotosDePropiedad(propiedad.id);

  return (
    <main>
      <h1>Editar propiedad</h1>
      <PropertyForm
        propiedad={{
          id: propiedad.id,
          tipo: propiedad.tipo as "nave_industrial" | "oficina" | "local_comercial",
          modalidad: propiedad.modalidad as "renta" | "venta" | "desde_cero",
          direccion: propiedad.direccion,
          lat: Number(propiedad.lat),
          lng: Number(propiedad.lng),
          estado: propiedad.estado as "SLP" | "Aguascalientes" | "Leon",
          ciudad: propiedad.ciudad,
          descripcion: propiedad.descripcion,
          estadoPublicacion: propiedad.estadoPublicacion as EstadoPublicacion,
          motivoRechazo: propiedad.motivoRechazo,
          fotos: fotos.map((foto) => ({ id: foto.id, storageUrl: foto.storageUrl })),
        }}
      />
    </main>
  );
}
