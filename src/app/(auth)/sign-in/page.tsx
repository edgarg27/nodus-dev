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
    <main>
      <h1>Iniciar sesión</h1>
      <SignInForm errorConfirmacion={error === "confirmacion"} />
    </main>
  );
}
