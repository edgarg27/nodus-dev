import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";

export default async function NuevaPropiedadPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
      <h1 className="px-4 text-2xl font-semibold text-foreground">Publicar una propiedad</h1>
      <PropertyForm />
    </main>
  );
}
