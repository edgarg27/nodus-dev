import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground">Mis leads</h1>
      {leads.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">Aún no tienes leads</p>
          <Button asChild>
            <Link href="/propiedades/nueva">Publicar una propiedad</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {leads.map((lead) => (
            <li
              key={lead.id}
              className="flex flex-col gap-1 rounded-lg bg-surface p-4 ring-1 ring-border shadow-sm"
            >
              <p className="text-sm font-medium text-text">{lead.direccionPropiedad}</p>
              <p className="text-sm text-text-muted">
                {lead.nombreBuscador} · {lead.emailBuscador}
              </p>
              {lead.quiereFinanciamiento ? (
                <p className="text-sm text-text-muted">Quiere financiamiento</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
