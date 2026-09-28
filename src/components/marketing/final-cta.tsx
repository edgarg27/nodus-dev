import Link from "next/link";
import { Reveal } from "./reveal";

interface FinalCtaProps {
  autenticado: boolean;
  buscarHref: string;
  publicarHref: string;
}

export function FinalCta({ autenticado, buscarHref, publicarHref }: FinalCtaProps) {
  return (
    <section className="bg-primary">
      <Reveal className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex max-w-lg flex-col gap-2.5">
          <h2 className="text-[30px] leading-tight font-bold text-primary-foreground">
            {autenticado
              ? "Sigue impulsando el crecimiento de tu empresa"
              : "Impulsa el crecimiento de tu empresa desde el primer día"}
          </h2>
          <p className="text-base text-primary-foreground/70">
            {autenticado
              ? "Retoma tu búsqueda o publica un nuevo espacio en minutos."
              : "Crea tu cuenta gratis y empieza a buscar o publicar espacios en minutos."}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href={buscarHref}
            className="flex h-[54px] items-center justify-center rounded-lg bg-accent px-7 text-[15px] font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {autenticado ? "Buscar espacios" : "Crear cuenta gratis"}
          </Link>
          <Link
            href={publicarHref}
            className="flex h-[54px] items-center justify-center rounded-lg border border-primary-foreground/25 px-7 text-[15px] font-semibold text-primary-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary-foreground active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Publicar un espacio
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
