import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";

export default async function NuevaPropiedadPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok) notFound();

  return (
    <main>
      <h1>Publicar una propiedad</h1>
      <PropertyForm />
    </main>
  );
}
