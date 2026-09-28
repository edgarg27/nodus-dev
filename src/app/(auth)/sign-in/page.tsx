import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getUsuarioActual } from "@/server/auth/session";

interface SignInPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

function destinoPorRol(rol: string): string {
  if (rol === "oferente") return "/propiedades";
  if (rol === "admin") return "/admin/propiedades";
  return "/buscar";
}

function esRutaRelativaSegura(next: string | undefined): next is string {
  return !!next && next.startsWith("/") && !next.startsWith("//");
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next, error } = await searchParams;
  const actor = await getUsuarioActual();

  if (actor) {
    redirect(esRutaRelativaSegura(next) ? next : destinoPorRol(actor.rol));
  }

  return (
    <main className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center bg-background px-5 py-12">
      <div className="animate-in fade-in slide-in-from-bottom-2 flex w-full max-w-[440px] flex-col rounded-2xl border border-border bg-card p-9 shadow-[0_24px_48px_-12px_rgba(11,30,61,0.12)] duration-500">
        <SignInForm errorConfirmacion={error === "confirmacion"} />
      </div>
    </main>
  );
}
