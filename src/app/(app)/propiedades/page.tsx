import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/properties/property-card";
import type { EstadoPublicacion } from "@/components/properties/status-badge";
import { Button } from "@/components/ui/button";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { listarPropiedadesDelDueno } from "@/server/properties/queries";

export default async function PropiedadesPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const propiedades = await listarPropiedadesDelDueno(actor.id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Mis propiedades</h1>
        {actor.isBroker ? (
          <Link href="/broker" className="text-sm text-primary underline underline-offset-4">
            Mi código de broker
          </Link>
        ) : (
          <Link href="/broker" className="text-sm text-primary underline underline-offset-4">
            Solicitar ser broker
          </Link>
        )}
      </div>
      {propiedades.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">Aún no tienes propiedades</p>
          <Button asChild>
            <Link href="/propiedades/nueva">Publicar una propiedad</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
