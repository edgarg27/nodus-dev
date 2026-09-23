import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/properties/property-card";
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
    <main>
      <h1>Mis propiedades</h1>
      {actor.isBroker ? (
        <Link href="/broker">Mi código de broker</Link>
      ) : (
        <Link href="/broker">Solicitar ser broker</Link>
      )}
      {propiedades.length === 0 ? (
        <div>
          <p>Aún no tienes propiedades</p>
          <Link href="/propiedades/nueva">Publicar una propiedad</Link>
        </div>
      ) : (
        <div>
          {propiedades.map((propiedad) => (
            <PropertyCard
              key={propiedad.id}
              propiedad={{
                ...propiedad,
                estadoPublicacion: propiedad.estadoPublicacion as EstadoPublicacion,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
