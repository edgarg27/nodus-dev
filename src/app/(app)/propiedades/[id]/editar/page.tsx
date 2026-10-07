import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import type { EstadoPublicacion } from "@/components/properties/status-badge";
import type { CodigoEstado } from "@/lib/estados";
import { extraerDetalles } from "@/lib/property-details";
import { listarContactosDeAgencia } from "@/server/agency/queries";
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

  const [fotos, contactos] = await Promise.all([
    obtenerFotosDePropiedad(propiedad.id),
    listarContactosDeAgencia(actor.id),
  ]);

  return (
    <main className="w-full py-10">
      <PropertyForm
        contactos={contactos.map(({ id, tipo, valor }) => ({
          id,
          tipo: tipo as "email" | "telefono" | "whatsapp",
          valor,
        }))}
        propiedad={{
          id: propiedad.id,
          tipo: propiedad.tipo as "nave_industrial" | "oficina" | "local_comercial",
          modalidad: propiedad.modalidad as "renta" | "venta" | "desde_cero",
          direccion: propiedad.direccion,
          lat: Number(propiedad.lat),
          lng: Number(propiedad.lng),
          estado: propiedad.estado as CodigoEstado,
          ciudad: propiedad.ciudad,
          descripcion: propiedad.descripcion,
          aceptaFinanciamiento: propiedad.aceptaFinanciamiento,
          referencia: propiedad.referencia,
          titulo: propiedad.titulo,
          contactoId: propiedad.contactoId,
          compartidaEnRed: propiedad.compartidaEnRed,
          comisionPct: propiedad.comisionPct,
          exclusiva: propiedad.exclusiva,
          ...extraerDetalles(propiedad),
          estadoPublicacion: propiedad.estadoPublicacion as EstadoPublicacion,
          motivoRechazo: propiedad.motivoRechazo,
          fotos: fotos.map((foto) => ({ id: foto.id, storageUrl: foto.storageUrl })),
        }}
      />
    </main>
  );
}
