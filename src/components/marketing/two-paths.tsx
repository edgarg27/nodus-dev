import Link from "next/link";
import { type Idioma, textosDe } from "@/lib/i18n";
import { Reveal } from "./reveal";

interface TwoPathsProps {
  buscarHref: string;
  publicarHref: string;
  idioma: Idioma;
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-accent"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function TwoPaths({ buscarHref, publicarHref, idioma }: TwoPathsProps) {
  const t = textosDe(idioma).dosCaminos;
  return (
    <section className="bg-primary">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Reveal className="flex flex-col gap-5 rounded-2xl bg-card p-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <h3 className="text-[23px] font-bold text-foreground">{t.buscas.titulo}</h3>
          <p className="text-[15px] leading-relaxed text-muted-foreground">{t.buscas.texto}</p>
          <ul className="flex flex-col gap-3">
            {t.buscas.puntos.map((punto) => (
              <li key={punto} className="flex items-center gap-2.5 text-sm text-foreground">
                <CheckIcon />
                {punto}
              </li>
            ))}
          </ul>
          <Link
            href={buscarHref}
            className="mt-2 flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-primary/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {t.buscas.boton}
          </Link>
        </Reveal>

        <Reveal
          id="propietarios"
          delayMs={90}
          className="flex flex-col gap-5 rounded-2xl bg-card p-10"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </span>
          <h3 className="text-[23px] font-bold text-foreground">{t.tienes.titulo}</h3>
          <p className="text-[15px] leading-relaxed text-muted-foreground">{t.tienes.texto}</p>
          <ul className="flex flex-col gap-3">
            {t.tienes.puntos.map((punto) => (
              <li key={punto} className="flex items-center gap-2.5 text-sm text-foreground">
                <CheckIcon />
                {punto}
              </li>
            ))}
          </ul>
          <Link
            href={publicarHref}
            className="mt-2 flex h-12 w-fit items-center justify-center rounded-lg bg-accent px-6 text-[15px] font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {t.tienes.boton}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
