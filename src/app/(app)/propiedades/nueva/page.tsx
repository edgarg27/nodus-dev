import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { listarContactosDeAgencia } from "@/server/agency/queries";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";

export default async function NuevaPropiedadPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const contactos = await listarContactosDeAgencia(actor.id);

  return (
    <main className="w-full py-10">
      <PropertyForm
        contactos={contactos.map(({ id, tipo, valor }) => ({
          id,
          tipo: tipo as "email" | "telefono" | "whatsapp",
          valor,
        }))}
      />
    </main>
  );
}
