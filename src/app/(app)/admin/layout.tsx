import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { AdminToastProvider } from "@/components/admin/admin-toast";
import { contarParaMenuAdmin } from "@/server/admin/contadores";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "admin");
  if (!permiso.ok || !actor) notFound();

  // Textos y los números del menú (una sola consulta) en paralelo.
  const [{ t }, contadores] = await Promise.all([obtenerTextos(), contarParaMenuAdmin()]);
  const a = t.admin;

  return (
    <AdminToastProvider>
      <div className="flex min-h-dvh w-full flex-col bg-background text-text">
        {/* El usuario y "Cerrar sesión" ya están en el menú de la cuenta del encabezado del sitio. */}
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
          </div>
        </header>

        <div className="admin-shell flex w-full min-h-0 grow max-md:flex-col">
          <AdminSidebarNav
            pendingPropertiesCount={contadores.propiedadesPendientes}
            pendingRequestsCount={contadores.solicitudesBroker}
            activeBrokersCount={contadores.brokersActivos}
            pendingClientsCount={contadores.clientesPorAtender}
            unreadChatsCount={contadores.chatsSinLeer}
          />
          <main className="flex min-w-0 grow flex-col gap-6 overflow-y-auto px-10 pt-8 pb-16 max-md:px-5 max-md:pt-6">
            {children}
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
