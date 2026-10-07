import { type Idioma, textosDe } from "@/lib/i18n";
import { Reveal } from "./reveal";

// Trazos SVG de cada beneficio, en el mismo orden que porQue.items del diccionario.
const ICONOS = [
  "M2 20h20M4 20V10l8-6 8 6v10M9 20v-6h6v6",
  "M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4ZM9 12l2 2 4-4",
  "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
];

export function WhyNodus({ idioma }: { idioma: Idioma }) {
  const t = textosDe(idioma).porQue;
  const beneficios = t.items.map((item, indice) => ({ ...item, icono: ICONOS[indice] }));
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="flex max-w-xl flex-col gap-3">
          <span className="text-[13px] font-bold tracking-wide text-primary uppercase">
            {t.etiqueta}
          </span>
          <h2 className="text-[34px] leading-tight font-bold text-foreground">{t.titulo}</h2>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {beneficios.map((beneficio, indice) => (
            <Reveal
              key={beneficio.titulo}
              delayMs={indice * 90}
              className="flex flex-col gap-3.5 rounded-2xl border border-border p-6 hover:border-accent"
            >
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-background">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-foreground"
                  aria-hidden="true"
                >
                  <path d={beneficio.icono} />
                </svg>
              </span>
              <h3 className="text-[17px] font-semibold text-foreground">{beneficio.titulo}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {beneficio.descripcion}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
