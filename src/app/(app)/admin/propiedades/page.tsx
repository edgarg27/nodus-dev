import { PropertyReviewCard } from "@/components/admin/property-review-card";
import { listarPendientesDeRevision } from "@/server/properties/queries";

export default async function AdminPropiedadesPage() {
  const propiedades = await listarPendientesDeRevision();

  return (
    <main>
      <h1>Propiedades por revisar</h1>
      {propiedades.length === 0 ? (
        <p>No hay propiedades pendientes de revisión</p>
      ) : (
        <ul>
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
