import Link from "next/link";
import { type EstadoPublicacion, StatusBadge } from "./status-badge";

export interface PropertyCardData {
  id: string;
  direccion: string;
  tipo: string;
  modalidad: string;
  ciudad: string;
  estadoPublicacion: EstadoPublicacion;
  motivoRechazo: string | null;
}

interface PropertyCardProps {
  propiedad: PropertyCardData;
}

export function PropertyCard({ propiedad }: PropertyCardProps) {
  return (
    <article>
      <h3>{propiedad.direccion}</h3>
      <p>
        {propiedad.tipo} · {propiedad.modalidad} · {propiedad.ciudad}
      </p>
      <StatusBadge estado={propiedad.estadoPublicacion} />
      {propiedad.estadoPublicacion === "rechazada" ? (
        <div>
          <p>{propiedad.motivoRechazo}</p>
          <Link href={`/propiedades/${propiedad.id}/editar`}>Corregir y reenviar</Link>
        </div>
      ) : null}
    </article>
  );
}
