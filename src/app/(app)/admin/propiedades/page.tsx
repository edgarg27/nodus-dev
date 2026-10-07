import { CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { PropertyReviewCard } from "@/components/admin/property-review-card";
import { obtenerTextos } from "@/server/i18n";
import { listarPendientesDeRevision } from "@/server/properties/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.propiedades.metaTitulo };
}

export default async function AdminPropiedadesPage() {
  const textos = (await obtenerTextos()).t.admin.propiedades;
  const propiedades = await listarPendientesDeRevision();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold text-text">{textos.titulo}</h1>
        <p className="text-sm text-text-muted">{textos.descripcion}</p>
      </div>

      {propiedades.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-text-muted">
          <CheckIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
          <span className="text-sm">{textos.vacio}</span>
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
