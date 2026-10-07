import { ShieldCheckIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { AgencyContacts } from "@/components/agency/agency-contacts";
import { AgencyProfileForm } from "@/components/agency/agency-profile-form";
import { iniciales } from "@/lib/initials";
import { listarContactosDeAgencia, obtenerPerfilAgencia } from "@/server/agency/queries";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";

export default async function PerfilPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const [perfil, contactos] = await Promise.all([
    obtenerPerfilAgencia(actor.id),
    listarContactosDeAgencia(actor.id),
  ]);

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-7 px-4">
        <header className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary font-display text-xl font-bold text-primary-foreground">
            {iniciales(perfil.nombre) || "?"}
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[26px] font-bold text-foreground">
              Perfil de la agencia
            </h1>
            {actor.isBroker ? (
              <span className="flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">
                <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
                Broker verificado
              </span>
            ) : null}
          </div>
        </header>

        <AgencyProfileForm nombre={perfil.nombre} descripcion={perfil.descripcion} />
        <AgencyContacts
          contactos={contactos.map(({ id, tipo, valor, propiedadesAsociadas }) => ({
            id,
            tipo: tipo as "email" | "telefono" | "whatsapp",
            valor,
            propiedadesAsociadas,
          }))}
        />
      </div>
    </main>
  );
}
