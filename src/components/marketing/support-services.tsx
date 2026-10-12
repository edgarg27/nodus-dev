import { ArrowUpRightIcon, BuildingIcon } from "lucide-react";
import Image from "next/image";
import type { CasoExitoVista } from "@/lib/casos-exito";
import { type Idioma, textosDe } from "@/lib/i18n";
import { FOTO_BANNER, FOTO_BANNER_ALTO, FOTO_BANNER_ANCHO, URL_NODUS } from "@/lib/servicios-apoyo";
import { Reveal } from "./reveal";

interface SupportServicesProps {
  idioma: Idioma;
  // Casos de éxito publicados por el admin (ya en el idioma del visitante). Sin ninguno, se
  // muestran tres tarjetas de ejemplo marcadas como tales.
  casos: CasoExitoVista[];
}

// "Encuentra tu servicio de apoyo": banner publicitario de Nodus (con su fotografía) y casos de
// éxito, que el admin captura en /admin/casos-exito.
export function SupportServices({ idioma, casos }: SupportServicesProps) {
  const t = textosDe(idioma).apoyo;
  const hayCasosReales = casos.length > 0;
  const tarjetas: (CasoExitoVista & { ejemplo: boolean })[] = hayCasosReales
    ? casos.map((caso) => ({ ...caso, ejemplo: false }))
    : t.casos.map((caso, indice) => ({
        id: `ejemplo-${indice}`,
        sector: caso.sector,
        titulo: caso.titulo,
        texto: caso.texto,
        fotoUrl: null,
        ejemplo: true,
      }));

  return (
    <section
      id="servicios-apoyo"
      aria-labelledby="apoyo-titulo"
      className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"
    >
      <Reveal className="flex flex-col gap-12">
        <div className="grid items-center gap-8 overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground shadow-sm md:grid-cols-[1fr_auto] md:p-10">
          <div className="flex flex-col gap-4">
            <span className="text-[13px] font-bold tracking-wide text-accent uppercase">
              {t.etiqueta}
            </span>
            <h2 id="apoyo-titulo" className="text-[34px] leading-tight font-bold">
              {t.titulo}
            </h2>
            <p className="max-w-xl text-[15px] leading-relaxed text-primary-foreground/80">
              {t.texto}
            </p>
            <a
              href={URL_NODUS}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex h-12 w-fit items-center gap-2 rounded-lg bg-accent px-6 text-[15px] font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 motion-reduce:transition-none"
            >
              {t.boton}
              <ArrowUpRightIcon className="size-4" aria-hidden="true" />
            </a>
          </div>
          <Image
            src={FOTO_BANNER}
            alt={t.fotoAlt}
            width={FOTO_BANNER_ANCHO}
            height={FOTO_BANNER_ALTO}
            sizes="(min-width: 768px) 320px, 280px"
            className="h-auto w-full max-w-[280px] rounded-2xl object-cover md:max-w-[320px]"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex max-w-xl flex-col gap-2">
            <h3 className="text-[24px] leading-tight font-bold text-foreground">{t.casosTitulo}</h3>
            <p className="text-sm text-muted-foreground">
              {hayCasosReales ? t.casosTextoReales : t.casosTexto}
            </p>
          </div>
          <ul className="grid gap-5 md:grid-cols-3">
            {tarjetas.map((caso) => (
              <li
                key={caso.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
              >
                <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-primary/70 to-primary text-primary-foreground/60">
                  {caso.fotoUrl ? (
                    // biome-ignore lint/performance/noImgElement: fotografía subida por el admin
                    <img src={caso.fotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <BuildingIcon className="size-10" strokeWidth={1.5} aria-hidden="true" />
                  )}
                  {caso.ejemplo ? (
                    <span className="absolute top-3 left-3 rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-foreground">
                      {t.ejemplo}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 p-5">
                  <span className="text-xs font-semibold tracking-wide text-warning uppercase">
                    {caso.sector}
                  </span>
                  <h4 className="text-[17px] leading-snug font-bold text-foreground">
                    {caso.titulo}
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{caso.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
