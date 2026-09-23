import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { listarLeadsDelOferente } from "@/server/contact-requests/queries";

interface LeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const params = await searchParams;
  const propiedadIdRaw = params.propiedad_id;
  const propiedadId = typeof propiedadIdRaw === "string" ? propiedadIdRaw : undefined;

  const leads = await listarLeadsDelOferente(actor.id, propiedadId);

  return (
    <main>
      <h1>Mis leads</h1>
      {leads.length === 0 ? (
        <div>
          <p>Aún no tienes leads</p>
          <Link href="/propiedades/nueva">Publicar una propiedad</Link>
        </div>
      ) : (
        <ul>
          {leads.map((lead) => (
            <li key={lead.id}>
              <p>{lead.direccionPropiedad}</p>
              <p>
                {lead.nombreBuscador} · {lead.emailBuscador}
              </p>
              {lead.quiereFinanciamiento ? <p>Quiere financiamiento</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
