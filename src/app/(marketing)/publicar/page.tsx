import { CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PublishForm } from "@/components/publicar/publish-form";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.panel.publicar.metaTitulo };
}

// "Publica tu espacio": sin sesión invita a registrarse como oferente; un buscador completa sus
// datos y su cuenta pasa a oferente; un oferente va directo a publicar.
export default async function PublicarPage() {
  const actor = await getUsuarioActual();
  if (actor?.rol === "oferente") redirect("/propiedades/nueva");

  const { idioma, t } = await obtenerTextos();
  const p = t.panel.publicar;

  return (
    <>
      <main className="flex justify-center bg-background">
        <div className="grid w-full max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
          <section className="flex flex-col gap-5">
            <h1 className="font-display text-[30px] leading-tight font-bold text-text sm:text-[38px]">
              {p.titulo}
            </h1>
            <p className="text-[15px] leading-relaxed text-text-muted">{p.descripcion}</p>
            <ul className="flex flex-col gap-3">
              {p.beneficios.map((beneficio) => (
                <li key={beneficio} className="flex items-center gap-2.5 text-[15px] text-text">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                    <CheckIcon className="size-3.5" aria-hidden="true" />
                  </span>
                  {beneficio}
                </li>
              ))}
            </ul>
          </section>

          <div>
            {actor?.rol === "buscador" ? (
              <PublishForm />
            ) : actor?.rol === "admin" ? (
              <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-muted">
                {p.adminTexto}
              </p>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <p className="text-sm text-text-muted">{p.visitanteTexto}</p>
                <Link
                  href="/sign-up?rol=oferente"
                  className="flex h-12 items-center justify-center rounded-lg bg-accent text-[15px] font-bold text-accent-foreground shadow-sm hover:bg-accent/90"
                >
                  {p.crearCuenta}
                </Link>
                <Link
                  href="/sign-in?next=/publicar"
                  className="flex h-12 items-center justify-center rounded-lg border border-border text-[15px] font-semibold text-text hover:border-text"
                >
                  {p.yaTengoCuenta}
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter idioma={idioma} />
    </>
  );
}
