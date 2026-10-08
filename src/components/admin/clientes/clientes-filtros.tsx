import { SearchIcon } from "lucide-react";
import Link from "next/link";
import {
  ESTADOS_CLIENTE,
  type EstadoCliente,
  type ParamsClientes,
  VISTAS_CLIENTES,
} from "@/lib/clientes";
import type { Textos } from "@/lib/i18n";

interface ClientesFiltrosProps {
  params: ParamsClientes;
  porEstado: Record<EstadoCliente, number>;
  textos: Textos["admin"]["clientes"];
}

// Liga a la lista con los filtros actuales y los cambios indicados (la página vuelve a la 1).
export function hrefClientes(params: ParamsClientes, cambios: Partial<ParamsClientes>): string {
  const siguiente = { ...params, pagina: 1, ...cambios };
  const query = new URLSearchParams();
  if (siguiente.vista !== "solicitudes") query.set("vista", siguiente.vista);
  if (siguiente.estado) query.set("estado", siguiente.estado);
  if (siguiente.q) query.set("q", siguiente.q);
  if (siguiente.pagina > 1) query.set("pagina", String(siguiente.pagina));
  const texto = query.toString();
  return texto ? `/admin/clientes?${texto}` : "/admin/clientes";
}

const PILDORA =
  "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out";

function clasePildora(activa: boolean): string {
  return `${PILDORA} ${
    activa
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-surface text-text hover:border-primary"
  }`;
}

// Vista (con solicitudes / todos los registrados), etapa y búsqueda. Todo vive en la URL.
export function ClientesFiltros({ params, porEstado, textos }: ClientesFiltrosProps) {
  const total = ESTADOS_CLIENTE.reduce((suma, estado) => suma + porEstado[estado], 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {VISTAS_CLIENTES.map((vista) => (
          <Link
            key={vista}
            href={hrefClientes(params, { vista, estado: null })}
            aria-current={params.vista === vista ? "page" : undefined}
            className={clasePildora(params.vista === vista)}
          >
            {textos.vistas[vista]}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={hrefClientes(params, { estado: null })}
            className={clasePildora(params.estado === null)}
          >
            {textos.todos} · {total}
          </Link>
          {ESTADOS_CLIENTE.map((estado) => (
            <Link
              key={estado}
              href={hrefClientes(params, { estado })}
              className={clasePildora(params.estado === estado)}
            >
              {textos.estados[estado]} · {porEstado[estado]}
            </Link>
          ))}
        </div>

        <form action="/admin/clientes" method="get" className="flex w-full gap-2 sm:w-auto">
          {params.vista !== "solicitudes" ? (
            <input type="hidden" name="vista" value={params.vista} />
          ) : null}
          {params.estado ? <input type="hidden" name="estado" value={params.estado} /> : null}
          <label className="relative flex grow sm:w-72">
            <span className="sr-only">{textos.buscar}</span>
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder={textos.buscar}
              className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-sm text-text placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="submit"
            className="h-10 cursor-pointer rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {textos.buscarBoton}
          </button>
        </form>
      </div>
    </div>
  );
}
