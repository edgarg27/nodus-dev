import { HeadsetIcon } from "lucide-react";
import Link from "next/link";
import { type Idioma, textosDe } from "@/lib/i18n";

interface NotFoundBannerProps {
  autenticado: boolean;
  // Chat con Captive o, sin sesión, iniciar sesión primero.
  ayudaHref: string;
  idioma: Idioma;
}

// Cierre de la portada: quien no encontró lo que buscaba escribe al equipo de Captive. Es una
// tarjeta sobre superficie (no un bloque navy) para que se distinga también en modo oscuro.
export function NotFoundBanner({ autenticado, ayudaHref, idioma }: NotFoundBannerProps) {
  const t = textosDe(idioma).bannerAyuda;
  return (
    <section aria-labelledby="banner-ayuda-titulo" className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl border border-accent/40 bg-surface p-8 shadow-sm md:p-12">
          <div className="flex max-w-xl items-start gap-5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <HeadsetIcon className="size-7" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2.5">
              <h2
                id="banner-ayuda-titulo"
                className="text-[30px] leading-tight font-bold text-text"
              >
                {t.titulo}
              </h2>
              <p className="text-base text-text-muted">{t.texto}</p>
            </div>
          </div>
          <Link
            href={ayudaHref}
            className="flex h-[54px] items-center justify-center rounded-lg bg-accent px-7 text-[15px] font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {autenticado ? t.boton : t.botonVisitante}
          </Link>
        </div>
      </div>
    </section>
  );
}
