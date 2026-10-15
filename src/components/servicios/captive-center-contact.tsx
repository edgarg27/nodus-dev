import { CalendarCheckIcon, CheckIcon, MailIcon, PhoneIcon } from "lucide-react";
import { hrefWhatsappCaptive } from "@/lib/captive-ayuda";
import { CONTACTO_CAPTIVE_CENTER } from "@/lib/captive-center";
import { type Idioma, textosDe } from "@/lib/i18n";

// Cierre de Captive Center: para qué sirve y cómo agendar una reunión (WhatsApp de Captive si está
// configurado; si no, correo).
export function CaptiveCenterContact({ idioma }: { idioma: Idioma }) {
  const c = textosDe(idioma).captiveCenter;
  const { telefono, correo } = CONTACTO_CAPTIVE_CENTER;
  const agendar =
    hrefWhatsappCaptive(c.ctaMensaje) ??
    `mailto:${correo}?subject=${encodeURIComponent(c.ctaAsunto)}&body=${encodeURIComponent(c.ctaMensaje)}`;

  return (
    <div className="grid gap-8 rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8 lg:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-4">
        <h3 className="font-display text-2xl leading-tight font-bold">{c.ctaTitulo}</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {c.ctaPuntos.map((punto) => (
            <li key={punto} className="flex items-start gap-2 text-sm text-primary-foreground/85">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              {punto}
            </li>
          ))}
        </ul>
        <p className="max-w-2xl text-sm leading-relaxed text-primary-foreground/75">{c.ctaTexto}</p>
        <p className="text-sm font-semibold">{c.lema}</p>
      </div>

      <div className="flex flex-col justify-center gap-3 lg:min-w-[260px]">
        <a
          href={agendar}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground shadow-sm transition-colors duration-150 ease-out hover:bg-accent/90"
        >
          <CalendarCheckIcon className="size-4" aria-hidden="true" />
          {c.ctaBoton}
        </a>
        <a
          href={`mailto:${correo}`}
          className="flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground"
        >
          <MailIcon className="size-4" aria-hidden="true" />
          {correo}
        </a>
        <a
          href={`tel:${telefono.replace(/\s/g, "")}`}
          className="flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground"
        >
          <PhoneIcon className="size-4" aria-hidden="true" />
          {telefono}
        </a>
      </div>
    </div>
  );
}
