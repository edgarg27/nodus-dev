import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { VerificationNotice } from "@/components/verificacion/verification-notice";
import { usaLaRed } from "@/lib/red-acceso";
import { listarContactosDeAgencia } from "@/server/agency/queries";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";
import { obtenerVerificacion } from "@/server/verificacion/estado";

export default async function NuevaPropiedadPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "propietario");
  if (!permiso.ok || !actor) notFound();

  // Mientras Captive no apruebe la cuenta no hay formulario: se le manda a completar su verificación.
  const verificacion = await obtenerVerificacion(actor.id);
  if (verificacion.estado === "pendiente" || verificacion.estado === "denegada") {
    const { idioma } = await obtenerTextos();
    return (
      <main className="mx-auto w-full max-w-[760px] px-4 py-10">
        <VerificationNotice
          idioma={idioma}
          estado={verificacion.estado}
          faltanDocumentos={verificacion.faltantes.length > 0}
        />
      </main>
    );
  }

  const contactos = await listarContactosDeAgencia(actor.id);

  return (
    <main className="w-full py-10">
      <PropertyForm
        conRed={usaLaRed(actor)}
        contactos={contactos.map(({ id, tipo, valor }) => ({
          id,
          tipo: tipo as "email" | "telefono" | "whatsapp",
          valor,
        }))}
      />
    </main>
  );
}
