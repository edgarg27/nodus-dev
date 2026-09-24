import { PropertyReviewCard } from "@/components/admin/property-review-card";
import { listarPendientesDeRevision } from "@/server/properties/queries";

export default async function AdminPropiedadesPage() {
  const propiedades = await listarPendientesDeRevision();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Propiedades por revisar</h1>
      {propiedades.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay propiedades pendientes de revisión</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {propiedades.map((propiedad) => (
            <li key={propiedad.id}>
              <PropertyReviewCard propiedad={propiedad} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
