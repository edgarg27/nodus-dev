import { redirect } from "next/navigation";
import { CreatePasswordForm } from "@/components/auth/create-password-form";
import { getUsuarioActual } from "@/server/auth/session";

interface CrearContrasenaPageProps {
  searchParams: Promise<{ next?: string; modo?: string }>;
}

function destinoPorRol(rol: string): string {
  if (rol === "oferente") return "/panel";
  if (rol === "admin") return "/admin/propiedades";
  return "/buscar";
}

// Se llega con la sesión que abrió el enlace del correo (confirmación de registro o recuperación).
export default async function CrearContrasenaPage({ searchParams }: CrearContrasenaPageProps) {
  const actor = await getUsuarioActual();
  if (!actor) redirect("/sign-in?error=confirmacion");

  const { next, modo } = await searchParams;
  const destino =
    next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/crear-contrasena")
      ? next
      : destinoPorRol(actor.rol);

  return (
    <main className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center bg-background px-5 py-10">
      <div className="animate-in fade-in slide-in-from-bottom-2 flex w-full max-w-[460px] flex-col rounded-2xl border border-border bg-card p-9 shadow-[0_24px_48px_-12px_rgba(11,30,61,0.12)] duration-500">
        <CreatePasswordForm destino={destino} modo={modo === "recuperar" ? "recuperar" : "nueva"} />
      </div>
    </main>
  );
}
