"use client";

import { BuildingIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";

export interface CasoCarrusel {
  id: string;
  sector: string;
  titulo: string;
  texto: string;
  fotoUrl: string | null;
  // Tarjeta de muestra mientras el admin no publica casos reales.
  ejemplo: boolean;
}

interface SuccessCasesCarouselProps {
  casos: CasoCarrusel[];
}

// Tiempo entre un caso y el siguiente cuando avanza solo.
const INTERVALO_MS = 7000;

// Casos de éxito de uno en uno: foto a un lado y texto al otro (apilados en el celular), con
// flechas, puntos, deslizar con el dedo y avance automático. El avance se detiene con el puntero o
// el foco encima, con la pestaña oculta y si el visitante pidió reducir el movimiento.
export function SuccessCasesCarousel({ casos }: SuccessCasesCarouselProps) {
  const t = useIdioma().t.apoyo;
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const inicioToque = useRef<number | null>(null);
  const total = casos.length;

  const ir = useCallback(
    (siguiente: number) => setIndice(((siguiente % total) + total) % total),
    [total],
  );

  useEffect(() => {
    if (total < 2 || pausado) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const temporizador = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndice((actual) => (actual + 1) % total);
    }, INTERVALO_MS);
    return () => window.clearInterval(temporizador);
  }, [total, pausado]);

  if (total === 0) return null;

  const boton =
    "flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary";

  return (
    <section
      aria-roledescription="carrusel"
      aria-label={t.carrusel}
      className="flex flex-col gap-5"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div
        className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
        onTouchStart={(evento) => {
          inicioToque.current = evento.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(evento) => {
          const inicio = inicioToque.current;
          const fin = evento.changedTouches[0]?.clientX;
          inicioToque.current = null;
          if (inicio === null || fin === undefined || total < 2) return;
          if (Math.abs(fin - inicio) > 50) ir(fin < inicio ? indice + 1 : indice - 1);
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${indice * 100}%)` }}
        >
          {casos.map((caso, i) => (
            <article
              key={caso.id}
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} / ${total}`}
              aria-hidden={i !== indice}
              inert={i !== indice}
              className="grid w-full shrink-0 md:grid-cols-[1.1fr_1fr]"
            >
              <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-primary/70 to-primary text-primary-foreground/60 sm:h-72 md:h-full md:min-h-[340px]">
                {caso.fotoUrl ? (
                  // biome-ignore lint/performance/noImgElement: fotografía subida por el admin
                  <img
                    src={caso.fotoUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <BuildingIcon className="size-14" strokeWidth={1.4} aria-hidden="true" />
                )}
                {caso.ejemplo ? (
                  <span className="absolute top-4 left-4 rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-foreground">
                    {t.ejemplo}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col justify-center gap-3 p-7 md:p-10">
                <span className="text-xs font-semibold tracking-wide text-warning uppercase">
                  {caso.sector}
                </span>
                <h4 className="text-[22px] leading-snug font-bold text-foreground md:text-[26px]">
                  {caso.titulo}
                </h4>
                <p className="text-[15px] leading-relaxed text-muted-foreground">{caso.texto}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {total > 1 ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {casos.map((caso, i) => (
              <button
                key={caso.id}
                type="button"
                aria-label={t.irACaso(i + 1)}
                aria-current={i === indice ? "true" : undefined}
                onClick={() => ir(i)}
                className={`h-2.5 cursor-pointer rounded-full transition-all duration-300 ${
                  i === indice ? "w-8 bg-accent" : "w-2.5 bg-border hover:bg-muted-foreground"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t.casoAnterior}
              onClick={() => ir(indice - 1)}
              className={boton}
            >
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t.casoSiguiente}
              onClick={() => ir(indice + 1)}
              className={boton}
            >
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
