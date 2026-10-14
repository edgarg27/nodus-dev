import { ChevronRightIcon, HouseIcon, SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OwnerNumber } from "@/components/admin/owner-number";
import { ZONA_HORARIA } from "@/lib/clientes";
import { localeDe } from "@/lib/i18n";
import { iniciales } from "@/lib/initials";
import { getUsuarioActual } from "@/server/auth/session";
import { listarDuenos } from "@/server/duenos/queries";
import { obtenerTextos } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.duenos.metaTitulo };
}

interface AdminDuenosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Dueños: propietarios que publican sus propios espacios. El layout ya exige rol admin.
export default async function AdminDuenosPage({ searchParams }: AdminDuenosPageProps) {
  const crudo = (await searchParams).q;
  const q = (Array.isArray(crudo) ? crudo[0] : crudo)?.trim().slice(0, 100) ?? "";
  const [{ idioma, t }, actor] = await Promise.all([obtenerTextos(), getUsuarioActual()]);
  const textos = t.admin.duenos;
  const duenos = await listarDuenos(actor, q);
  const formatoFecha = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: ZONA_HORARIA,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold text-text">{textos.titulo}</h1>
        <p className="max-w-3xl text-sm text-text-muted">{textos.descripcion}</p>
      </div>

      <form action="/admin/duenos" method="get" className="flex w-full gap-2 sm:max-w-md">
        <label className="relative flex grow">
          <span className="sr-only">{textos.buscar}</span>
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={textos.buscar}
            className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-sm text-text placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="submit"
          className="h-10 cursor-pointer rounded-lg bg-cta px-4 text-sm font-semibold text-cta-foreground hover:bg-cta/90"
        >
          {textos.buscarBoton}
        </button>
      </form>

      {duenos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-text-muted">
          <HouseIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
          <span className="text-sm">{textos.vacio}</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {duenos.map((dueno) => {
            const { publicadas, pendientes, rechazadas } = dueno.propiedades;
            const conteos = [
              publicadas > 0 ? textos.publicadas(publicadas) : null,
              pendientes > 0 ? textos.pendientes(pendientes) : null,
              rechazadas > 0 ? textos.rechazadas(rechazadas) : null,
            ].filter(Boolean);
            return (
              <li key={dueno.id}>
                <Link
                  href={`/admin/duenos/${dueno.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors duration-150 ease-out hover:border-ink"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                    {iniciales(dueno.nombre)}
                  </span>
                  <div className="flex min-w-0 grow flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-text">{dueno.nombre}</span>
                      {dueno.mensajesSinLeer > 0 ? (
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                          {textos.mensajesNuevos(dueno.mensajesSinLeer)}
                        </span>
                      ) : null}
                    </div>
                    <OwnerNumber
                      numero={dueno.numeroPropietario}
                      estados={dueno.estados}
                      etiqueta={t.admin.numeroPropietario}
                    />
                    <span className="truncate text-sm text-text-muted">
                      {dueno.email}
                      {dueno.telefono ? ` · ${dueno.telefono}` : ""}
                    </span>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1 text-right text-xs text-text-muted sm:flex">
                    <span className="text-sm font-semibold text-text">
                      {conteos.length > 0 ? conteos.join(" · ") : textos.sinPropiedades}
                    </span>
                    <span>{textos.registrado(formatoFecha.format(dueno.registradoEn))}</span>
                  </div>
                  <ChevronRightIcon
                    className="size-4 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
