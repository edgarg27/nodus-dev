import { CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CaptiveCenter } from "@/components/servicios/captive-center";
import { ServicioIcono } from "@/components/servicios/servicio-icono";
import { SERVICIOS } from "@/lib/servicios";
import { obtenerTextos } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.servicios.metaTitulo, description: t.servicios.metaDescripcion };
}

// /servicios: todo lo que ofrece Captive. Cada sección tiene su ancla (el menú "Servicios" del
// header lleva directo a ella) y un botón a la pantalla que ya da ese servicio.
export default async function ServiciosPage() {
  const { idioma, t } = await obtenerTextos();
  const s = t.servicios;

  return (
    <>
      <main className="bg-background">
        <section className="bg-primary">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <span className="text-xs font-bold tracking-widest text-accent uppercase">
              {s.etiqueta}
            </span>
            <h1 className="max-w-3xl font-display text-[32px] leading-tight font-bold text-primary-foreground sm:text-[48px]">
              {s.titulo}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-primary-foreground/80">
              {s.intro}
            </p>
          </div>
        </section>

        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
          {SERVICIOS.map((servicio) => {
            const textos = s.items[servicio.clave];
            return (
              <section
                key={servicio.clave}
                id={servicio.ancla}
                aria-labelledby={`${servicio.ancla}-titulo`}
                className="grid scroll-mt-24 gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8 lg:grid-cols-[1fr_320px] lg:gap-12"
              >
                <div className="flex flex-col gap-4">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <ServicioIcono clave={servicio.clave} className="size-6" />
                  </span>
                  <h2
                    id={`${servicio.ancla}-titulo`}
                    className="font-display text-2xl font-bold text-text"
                  >
                    {textos.titulo}
                  </h2>
                  <p className="text-base leading-relaxed text-text-muted">{textos.descripcion}</p>
                </div>

                <div className="flex flex-col justify-between gap-6">
                  <ul className="flex flex-col gap-3">
                    {textos.puntos.map((punto) => (
                      <li key={punto} className="flex items-start gap-2.5 text-sm text-text">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                          <CheckIcon className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="pt-0.5">{punto}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={servicio.href}
                    className="flex h-12 items-center justify-center rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm transition-colors duration-150 ease-out hover:bg-accent/90"
                  >
                    {textos.boton}
                  </Link>
                </div>
              </section>
            );
          })}

          <CaptiveCenter idioma={idioma} />
        </div>
      </main>
      <SiteFooter idioma={idioma} />
    </>
  );
}
