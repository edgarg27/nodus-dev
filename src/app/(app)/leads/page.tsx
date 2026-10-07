import Link from "next/link";
import { notFound } from "next/navigation";
import { InboxHeader } from "@/components/leads/inbox-header";
import { LeadPersonRow } from "@/components/leads/lead-person-row";
import { PaginationBar } from "@/components/properties/pagination-bar";
import { bandejaAParams, leerBandeja, POR_PAGINA_LEADS } from "@/lib/leads";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { listarBandejaDelOferente } from "@/server/contact-requests/inbox";
import { obtenerTextos } from "@/server/i18n";

interface LeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const t = (await obtenerTextos()).t.panel.leads;
  const query = await searchParams;
  const params = leerBandeja((clave) => {
    const valor = query[clave];
    return typeof valor === "string" ? valor : undefined;
  });

  const bandeja = await listarBandejaDelOferente(actor.id, {
    q: params.q,
    estado: params.estado,
    pagina: params.pagina,
  });
  const sinLeads = bandeja.resumen.personas === 0 && !params.q;

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-4">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[26px] font-bold text-foreground">
              Bandeja de entrada
            </h1>
            <p className="text-sm text-muted-foreground">
              Personas que pidieron información de tus propiedades publicadas, con su seguimiento.
            </p>
          </div>
          <Link
            href="/propiedades"
            className="flex h-[46px] items-center whitespace-nowrap rounded-lg border border-input px-5 text-sm font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
          >
            Propiedades
          </Link>
        </div>

        {sinLeads ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-5 py-14 text-center text-muted-foreground">
            <span className="text-sm">Aún no tienes leads</span>
            <Link
              href="/propiedades/nueva"
              className="mt-2 flex h-[46px] items-center rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground hover:bg-accent/90"
            >
              {t.publicarPropiedad}
            </Link>
          </div>
        ) : (
          <>
            <InboxHeader params={params} resumen={bandeja.resumen} />
            {bandeja.personas.length > 0 ? (
              <>
                <div className="flex flex-col gap-4">
                  {bandeja.personas.map((persona) => (
                    <LeadPersonRow
                      key={`${persona.buscadorId}-${persona.estado}`}
                      persona={{
                        ...persona,
                        ultimaFecha: persona.ultimaFecha.toISOString(),
                      }}
                    />
                  ))}
                </div>
                <PaginationBar
                  pagina={bandeja.pagina}
                  porPagina={bandeja.porPagina ?? POR_PAGINA_LEADS}
                  total={bandeja.totalPersonas}
                  hrefDe={(pagina) => {
                    const consulta = bandejaAParams({ ...params, pagina }).toString();
                    return consulta ? `/leads?${consulta}` : "/leads";
                  }}
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-5 py-14 text-center text-muted-foreground">
                <span className="text-sm">Ningún lead coincide con tu búsqueda.</span>
                <Link href="/leads" className="text-sm font-semibold text-primary underline">
                  Borrar filtros
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
