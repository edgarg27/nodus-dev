import Link from "next/link";

type HeroProps = {
  ctaHref: string;
};

export function Hero({ ctaHref }: HeroProps) {
  return (
    <section className="bg-primary text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <h1 className="text-2xl font-bold sm:text-4xl">
          Encuentra la nave, oficina o local que tu negocio necesita
        </h1>
        <p className="max-w-xl text-base text-white/85 sm:text-lg">
          Nodus conecta pymes y startups en San Luis Potosí, Aguascalientes y León con oferentes
          verificados de espacios industriales, oficinas y locales comerciales.
        </p>
        <Link
          href={ctaHref}
          className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-primary transition-transform duration-150 ease-out hover:-translate-y-0.5"
        >
          Buscar propiedades
        </Link>
      </div>
    </section>
  );
}
