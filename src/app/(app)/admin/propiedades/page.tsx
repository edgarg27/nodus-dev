import { CheckIcon } from "lucide-react";
import { PropertyReviewCard } from "@/components/admin/property-review-card";
import { listarPendientesDeRevision } from "@/server/properties/queries";

export default async function AdminPropiedadesPage() {
  const propiedades = await listarPendientesDeRevision();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold text-text">Propiedades pendientes</h1>
        <p className="text-sm text-text-muted">
          Toda propiedad nace pendiente, incluidas las del staff de Nodus. Apruébala para que sea
          pública o recházala indicando un motivo.
        </p>
      </div>

      {propiedades.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-text-muted">
          <CheckIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
          <span className="text-sm">No hay propiedades pendientes de revisión.</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {propiedades.map((propiedad) => (
            <li key={propiedad.id}>
              <PropertyReviewCard propiedad={propiedad} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
