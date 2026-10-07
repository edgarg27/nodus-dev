import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadCard } from "@/components/leads/lead-card";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { listarLeadsDelOferente } from "@/server/contact-requests/queries";
import { obtenerTextos } from "@/server/i18n";

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
  const { idioma, t: textos } = await obtenerTextos();
  const t = textos.panel.leads;

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-7 px-4">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[26px] font-bold text-foreground">{t.titulo}</h1>
            <p className="text-sm text-muted-foreground">{t.descripcion}</p>
          </div>
          <Link
            href="/propiedades"
            className="flex h-[46px] items-center whitespace-nowrap rounded-lg border border-input px-5 text-sm font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
          >
            {t.misPublicaciones}
          </Link>
        </div>

        {leads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-5 py-14 text-center text-muted-foreground">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm">{t.sinLeads}</span>
            <Link
              href="/propiedades/nueva"
              className="mt-2 flex h-[46px] items-center rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground hover:bg-accent/90"
            >
              {t.publicarPropiedad}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} idioma={idioma} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
