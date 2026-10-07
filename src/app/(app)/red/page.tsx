import { notFound } from "next/navigation";
import { NetworkCard } from "@/components/network/network-card";
import { NetworkFilters } from "@/components/network/network-filters";
import { PaginationBar } from "@/components/properties/pagination-bar";
import { leerRed, redAParams } from "@/lib/red-params";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { listarPropiedadesDeLaRed } from "@/server/network/queries";

interface RedPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RedPage({ searchParams }: RedPageProps) {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const query = await searchParams;
  // Un parámetro inválido en la URL se ignora (la API, en cambio, responde 422).
  const params = leerRed((clave) => {
    const valor = query[clave];
    return typeof valor === "string" ? valor : undefined;
  });

  const { financiamiento, ...filtros } = params.filtros;
  const listado = await listarPropiedadesDeLaRed(
    {
      ...filtros,
      aceptaFinanciamiento: financiamiento === undefined ? undefined : financiamiento === "true",
      exclusiva: params.exclusiva || undefined,
      excluirOferenteId: params.ocultarPropias ? actor.id : undefined,
    },
    { orden: params.orden, pagina: params.pagina },
  );

  return (
    <main className="w-full py-10">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-4">
        <header className="flex flex-col gap-1.5">
          <h1 className="font-display text-[26px] font-bold text-foreground">Red inmobiliaria</h1>
          <p className="text-sm text-muted-foreground">
            Espacios que otros oferentes comparten contigo. La comisión que ves solo es visible
            entre oferentes.
          </p>
        </header>

        <NetworkFilters params={params} />

        <p className="text-sm font-semibold text-foreground">
          {listado.total.toLocaleString("es-MX")}{" "}
          {listado.total === 1 ? "propiedad en la red" : "propiedades en la red"}
        </p>

        {listado.filas.length > 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listado.filas.map((propiedad) => (
                <NetworkCard
                  key={propiedad.id}
                  propiedad={propiedad}
                  esPropia={propiedad.oferenteId === actor.id}
                />
              ))}
            </div>
            <PaginationBar
              pagina={listado.pagina}
              porPagina={listado.porPagina}
              total={listado.total}
              hrefDe={(pagina) => {
                const consulta = redAParams({ ...params, pagina }).toString();
                return consulta ? `/red?${consulta}` : "/red";
              }}
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-5 py-14 text-center text-muted-foreground">
            <span className="text-sm">
              Aún no hay propiedades que coincidan. Activa «Compartir en la Red» en tus propiedades
              para aparecer aquí.
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
