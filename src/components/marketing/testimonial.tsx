import { type Idioma, textosDe } from "@/lib/i18n";
import { Reveal } from "./reveal";

export function Testimonial({ idioma }: { idioma: Idioma }) {
  const t = textosDe(idioma).testimonio;
  return (
    <section className="mx-auto flex max-w-7xl justify-center px-4 py-24 sm:px-6 lg:px-8">
      <Reveal>
        <figure className="flex max-w-3xl flex-col items-center gap-7 text-center">
          <svg width="40" height="32" viewBox="0 0 40 32" fill="none" aria-hidden="true">
            <path
              d="M0 32V19.2C0 7.2 6.9 1.2 15.6 0v6.4c-4.2 1.2-6.6 4.4-6.8 8.8H14v16.8H0Zm22.4 0V19.2c0-12 6.9-18 15.6-19.2v6.4c-4.2 1.2-6.6 4.4-6.8 8.8h5.2v16.8H22.4Z"
              className="fill-accent/40"
            />
          </svg>
          <blockquote className="font-display text-[26px] leading-snug font-medium text-foreground">
            {t.cita}
          </blockquote>
          <figcaption className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-foreground">Mariana Cordero</span>
            <span className="text-sm text-muted-foreground">{t.cargo}</span>
          </figcaption>
        </figure>
      </Reveal>
    </section>
  );
}
