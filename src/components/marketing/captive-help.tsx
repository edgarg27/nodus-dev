"use client";

import { HeadsetIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { CaptiveHelpLink } from "@/components/marketing/captive-help-link";
import { esEnlaceWhatsapp } from "@/lib/captive-ayuda";

interface CaptiveHelpProps {
  // WhatsApp de Captive con la búsqueda ya escrita o, sin número configurado, el chat de la web.
  href: string;
  autenticado: boolean;
  // El del layout raíz (sin búsqueda); se oculta si la página trae el suyo, que lleva la búsqueda.
  global?: boolean;
}

// Botón de ayuda fijo abajo a la derecha de las pantallas de búsqueda: "¿No encontraste tu
// espacio?" lleva al chat con Captive. En móvil sube para no tapar el botón "Ver mapa".
export function CaptiveHelp({ href, autenticado, global = false }: CaptiveHelpProps) {
  const { t } = useIdioma();
  const r = t.resultados;
  // Por WhatsApp no hace falta cuenta: ni "inicia sesión" ni "crea tu cuenta".
  const porWhatsapp = esEnlaceWhatsapp(href);
  // En las pantallas de búsqueda el botón habla de la búsqueda; en el resto del sitio, de ayuda.
  const etiqueta = global ? r.ayudaFlotante : r.ayudaTitulo;
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  return (
    <div
      data-captive-help={global ? undefined : ""}
      className="fixed right-4 bottom-24 z-30 flex flex-col items-end gap-3 lg:right-6 lg:bottom-6"
    >
      {abierto ? (
        <section
          aria-label={r.ayudaTitulo}
          className="animate-in fade-in slide-in-from-bottom-2 flex w-[min(320px,calc(100vw-2rem))] flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-md duration-200 ease-out motion-reduce:animate-none"
        >
          <div className="flex items-start justify-between gap-3">
            {/* En la búsqueda el botón ya dice "¿No encontraste tu espacio?": no se repite aquí. */}
            {global ? (
              <h2 className="text-[15px] font-bold text-foreground">{r.ayudaTitulo}</h2>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">{r.ayudaTexto}</p>
            )}
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label={r.ayudaCerrar}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
          {global ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{r.ayudaTexto}</p>
          ) : null}
          <CaptiveHelpLink
            href={href}
            className="flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 motion-reduce:transition-none"
          >
            {porWhatsapp
              ? r.ayudaBotonWhatsapp
              : autenticado
                ? r.ayudaBoton
                : r.ayudaBotonVisitante}
          </CaptiveHelpLink>
          {autenticado || porWhatsapp ? null : (
            <Link
              href="/sign-up"
              className="text-center text-[13px] font-semibold text-foreground underline underline-offset-4"
            >
              {r.ayudaCrearCuenta}
            </Link>
          )}
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-expanded={abierto}
        className="flex h-12 cursor-pointer items-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-accent-foreground shadow-md transition-transform duration-150 ease-out hover:-translate-y-px motion-reduce:transition-none"
      >
        <HeadsetIcon className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">{etiqueta}</span>
        <span className="sr-only sm:hidden">{etiqueta}</span>
      </button>
    </div>
  );
}
