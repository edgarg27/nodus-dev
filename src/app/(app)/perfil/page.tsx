import { ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgencyAvatar } from "@/components/agency/agency-avatar";
import { AgencyContacts } from "@/components/agency/agency-contacts";
import { AgencyLogoField } from "@/components/agency/agency-logo-field";
import { AgencyProfileForm } from "@/components/agency/agency-profile-form";
import { listarContactosDeAgencia, obtenerPerfilAgencia } from "@/server/agency/queries";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.panel.agencia.metaTitulo };
}

export default async function PerfilPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const a = (await obtenerTextos()).t.panel.agencia;
  const [perfil, contactos] = await Promise.all([
    obtenerPerfilAgencia(actor.id),
    listarContactosDeAgencia(actor.id),
  ]);

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-7 px-4">
        <header className="flex items-center gap-4">
          <AgencyAvatar
            nombre={perfil.nombre}
            logoUrl={perfil.logoUrl}
            className="size-16 rounded-2xl text-xl"
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[26px] font-bold text-foreground">{a.titulo}</h1>
            {actor.isBroker ? (
              <span className="flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">
                <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
                {a.brokerVerificado}
              </span>
            ) : null}
          </div>
        </header>

        <AgencyLogoField nombre={perfil.nombre} logoUrl={perfil.logoUrl} />
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
