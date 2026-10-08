import { UserRoundSearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ClienteFila } from "@/components/admin/clientes/cliente-fila";
import { ClientesFiltros, hrefClientes } from "@/components/admin/clientes/clientes-filtros";
import { leerParamsClientes } from "@/lib/clientes";
import { localeDe } from "@/lib/i18n";
import { getUsuarioActual } from "@/server/auth/session";
import { listarClientes } from "@/server/clientes/queries";
import { obtenerTextos } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.admin.clientes.metaTitulo };
}

interface AdminClientesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Clientes y prospectos: las solicitudes de informes llegan aquí (ya no al oferente) y Captive les
// da seguimiento. El layout ya exige rol admin.
export default async function AdminClientesPage({ searchParams }: AdminClientesPageProps) {
  const crudos = await searchParams;
  const params = leerParamsClientes((clave) => {
    const valor = crudos[clave];
    return Array.isArray(valor) ? valor[0] : valor;
  });
  const [{ idioma, t }, actor] = await Promise.all([obtenerTextos(), getUsuarioActual()]);
  const textos = t.admin.clientes;
  const lista = await listarClientes(actor, params);
  const formatoFecha = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const paginas = Math.max(1, Math.ceil(lista.total / lista.porPagina));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold text-text">{textos.titulo}</h1>
        <p className="max-w-3xl text-sm text-text-muted">{textos.descripcion}</p>
      </div>

      <ClientesFiltros params={params} porEstado={lista.porEstado} textos={textos} />

      {lista.clientes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-text-muted">
          <UserRoundSearchIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
          <span className="text-sm">{textos.vacio}</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.clientes.map((cliente) => (
            <li key={cliente.id}>
              <ClienteFila cliente={cliente} textos={textos} formatoFecha={formatoFecha} />
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 ? (
        <nav className="flex items-center justify-between gap-3 text-sm" aria-label={textos.titulo}>
          {params.pagina > 1 ? (
            <Link
              href={hrefClientes(params, { pagina: params.pagina - 1 })}
              className="font-semibold text-text hover:text-primary"
            >
              ← {textos.anterior}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-text-muted">{textos.pagina(params.pagina, paginas)}</span>
          {params.pagina < paginas ? (
            <Link
              href={hrefClientes(params, { pagina: params.pagina + 1 })}
              className="font-semibold text-text hover:text-primary"
            >
              {textos.siguiente} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
