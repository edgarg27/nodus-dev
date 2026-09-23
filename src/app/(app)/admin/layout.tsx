import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "admin");
  if (!permiso.ok) notFound();

  return (
    <div>
      <nav className="flex gap-4 p-2">
        <Link className="inline-block px-2 py-2" href="/admin/propiedades">
          Propiedades
        </Link>
        <Link className="inline-block px-2 py-2" href="/admin/brokers">
          Brokers
        </Link>
      </nav>
      {children}
    </div>
  );
}
