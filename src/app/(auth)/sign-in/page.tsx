import Link from "next/link";
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
      <div className="animate-in fade-in slide-in-from-bottom-2 flex w-full max-w-[440px] flex-col gap-[26px] rounded-2xl border border-border bg-card p-9 shadow-[0_24px_48px_-12px_rgba(11,30,61,0.12)] duration-500">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-[26px] font-bold text-foreground">Bienvenido de vuelta</h1>
          <p className="text-sm text-muted-foreground">
            Inicia sesión para buscar o publicar espacios
          </p>
        </div>

        <SignInForm errorConfirmacion={error === "confirmacion"} />

        <div className="flex items-center gap-3">
          <div className="h-px flex-grow bg-border" />
          <span className="text-xs text-muted-foreground">o</span>
          <div className="h-px flex-grow bg-border" />
        </div>

        <Link
          href="/sign-up"
          className="flex h-12 items-center justify-center rounded-lg border border-border text-[15px] font-semibold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-foreground active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Crear una cuenta nueva
        </Link>
      </div>
    </main>
  );
}
