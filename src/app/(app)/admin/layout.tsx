import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { AdminToastProvider } from "@/components/admin/admin-toast";
import { SignOutLink } from "@/components/admin/sign-out-link";
import { iniciales } from "@/lib/initials";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { listarBrokersActivos, listarPendientes } from "@/server/broker-requests/queries";
import { contarClientesPorAtender } from "@/server/clientes/queries";
import { obtenerTextos } from "@/server/i18n";
import { listarPendientesDeRevision } from "@/server/properties/queries";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "admin");
  if (!permiso.ok || !actor) notFound();

  const a = (await obtenerTextos()).t.admin;
  const [propiedadesPendientes, solicitudesPendientes, brokersActivos, clientesPorAtender] =
    await Promise.all([
      listarPendientesDeRevision(),
      listarPendientes(),
      listarBrokersActivos(),
      contarClientesPorAtender(),
    ]);

  return (
    <AdminToastProvider>
      <div className="flex min-h-dvh w-full flex-col bg-background text-text">
        <header className="flex w-full justify-center border-b border-border bg-surface">
          <div className="flex w-full items-center justify-between gap-6 px-8 py-3.5 max-md:px-5">
            <div className="flex items-center gap-3.5">
              <Link
                href="/"
                aria-label={a.inicio}
                className="flex shrink-0 items-center transition-transform duration-200 ease-out hover:-translate-y-px hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0"
              >
                <span className="font-display text-xl font-bold text-text">Nodus</span>
              </Link>
              <span className="h-5 w-px bg-border max-sm:hidden" aria-hidden="true" />
              <span className="text-sm font-bold tracking-wide text-text-muted max-sm:hidden">
                {a.panel}
              </span>
            </div>
            <div className="flex min-w-0 shrink items-center gap-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">
                {iniciales(actor.nombre)}
              </span>
              <span className="truncate text-sm font-semibold text-text max-sm:hidden">
                {actor.nombre}
              </span>
              <SignOutLink />
            </div>
          </div>
        </header>

        <div className="admin-shell flex w-full min-h-0 grow max-md:flex-col">
          <AdminSidebarNav
            pendingPropertiesCount={propiedadesPendientes.length}
            pendingRequestsCount={solicitudesPendientes.length}
            activeBrokersCount={brokersActivos.length}
            pendingClientsCount={clientesPorAtender}
          />
          <main className="flex min-w-0 grow flex-col gap-6 overflow-y-auto px-10 pt-8 pb-16 max-md:px-5 max-md:pt-6">
            {children}
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
