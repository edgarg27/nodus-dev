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
      <nav>
        <Link href="/admin/propiedades">Propiedades</Link>
        <Link href="/admin/brokers">Brokers</Link>
      </nav>
      {children}
    </div>
  );
}
