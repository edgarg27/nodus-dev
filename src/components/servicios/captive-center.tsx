import {
  Building2Icon,
  CheckIcon,
  ClipboardCheckIcon,
  type LucideIcon,
  MapPinIcon,
  PencilRulerIcon,
  ScaleIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { ANCLA_CAPTIVE_CENTER } from "@/lib/captive-center";
import { type Idioma, textosDe } from "@/lib/i18n";
import { CaptiveCenterContact } from "./captive-center-contact";
import { CaptiveCenterProcess } from "./captive-center-process";

// En el orden de `captiveCenter.servicios` en src/lib/i18n.
const ICONOS_SERVICIOS: LucideIcon[] = [
  Building2Icon,
  PencilRulerIcon,
  WrenchIcon,
  ScaleIcon,
  ClipboardCheckIcon,
  UsersIcon,
];

// Sección completa de Captive Center en /servicios: el Soft Landing para empresas internacionales que
// se expanden a México (contenido de su presentación comercial).
export function CaptiveCenter({ idioma }: { idioma: Idioma }) {
  const c = textosDe(idioma).captiveCenter;
  return (
    <section
      id={ANCLA_CAPTIVE_CENTER}
      aria-labelledby="captive-center-titulo"
      className="flex scroll-mt-24 flex-col gap-12 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-10"
    >
      <header className="flex max-w-3xl flex-col gap-3">
        <span className="text-xs font-bold tracking-widest text-accent uppercase">
          {c.etiqueta}
        </span>
        <h2
          id="captive-center-titulo"
          className="font-display text-[28px] leading-tight font-bold text-text sm:text-[36px]"
        >
          {c.titulo}
        </h2>
        {c.intro.map((parrafo) => (
          <p key={parrafo} className="text-base leading-relaxed text-text-muted">
            {parrafo}
          </p>
        ))}
      </header>

      <div className="flex flex-col gap-5">
        <div className="flex max-w-3xl flex-col gap-2">
          <h3 className="font-display text-xl font-bold text-text">{c.serviciosTitulo}</h3>
          <p className="text-sm leading-relaxed text-text-muted">{c.serviciosIntro}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.servicios.map((servicio, indice) => {
            const Icono = ICONOS_SERVICIOS[indice] ?? Building2Icon;
            return (
              <li
                key={servicio.titulo}
                className="flex flex-col gap-2 rounded-xl border border-border bg-background p-5"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icono className="size-5" aria-hidden="true" />
                </span>
                <h4 className="font-semibold text-text">{servicio.titulo}</h4>
                <p className="text-sm leading-relaxed text-text-muted">{servicio.texto}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-xl font-bold text-text">{c.beneficiosTitulo}</h3>
          <p className="text-sm leading-relaxed text-text-muted">{c.beneficiosIntro}</p>
          <ul className="flex flex-col gap-3">
            {c.beneficios.map((beneficio) => (
              <li key={beneficio} className="flex items-start gap-2.5 text-sm text-text">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckIcon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="pt-0.5">{beneficio}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-text">{c.beneficiosCierre}</p>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="font-display text-xl font-bold text-text">{c.ubicacionesTitulo}</h3>
          <p className="text-sm leading-relaxed text-text-muted">{c.ubicacionesIntro}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {c.ubicaciones.map((ubicacion) => (
              <li
                key={ubicacion.ciudad}
                className="flex items-start gap-2.5 rounded-xl border border-border bg-background p-4"
              >
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text">{ubicacion.ciudad}</span>
                  <span className="text-sm text-text-muted">{ubicacion.sedes}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted">{c.ubicacionesNota}</p>
        </div>
      </div>

      <CaptiveCenterProcess idioma={idioma} />

      <div className="flex flex-col gap-5">
        <div className="flex max-w-3xl flex-col gap-2">
          <h3 className="font-display text-xl font-bold text-text">{c.testimoniosTitulo}</h3>
          <p className="text-sm leading-relaxed text-text-muted">{c.testimoniosIntro}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {c.testimonios.map((testimonio) => (
            <figure
              key={testimonio.autor}
              className="flex flex-col gap-3 rounded-xl border border-border bg-background p-5"
            >
              <blockquote className="text-sm leading-relaxed text-text">
                “{testimonio.cita}”
              </blockquote>
              <figcaption className="text-xs font-semibold text-text-muted">
                — {testimonio.autor}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <CaptiveCenterContact idioma={idioma} />
    </section>
  );
}
