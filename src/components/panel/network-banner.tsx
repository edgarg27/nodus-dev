"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { localeDe } from "@/lib/i18n";

interface NetworkBannerProps {
  propiedades: number;
  nuevas48h: number;
  brokers: number;
}

const CLAVE = "nodus:banner-red-cerrado";

function Cifra({ valor, etiqueta, locale }: { valor: number; etiqueta: string; locale: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-[28px] leading-none font-bold">
        {valor.toLocaleString(locale)}
      </span>
      <span className="text-[13px] text-primary-foreground/80">{etiqueta}</span>
    </div>
  );
}

// Banner de la Red inmobiliaria con sus números. Al cerrarlo se recuerda en el navegador; sin
// almacenamiento disponible simplemente reaparece.
export function NetworkBanner({ propiedades, nuevas48h, brokers }: NetworkBannerProps) {
  const { idioma, t } = useIdioma();
  const b = t.panel.inicio.banner;
  const locale = localeDe(idioma);
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    try {
      setCerrado(window.localStorage.getItem(CLAVE) === "1");
    } catch {
      // Sin almacenamiento: el banner se queda visible.
    }
  }, []);

  function cerrar() {
    setCerrado(true);
    try {
      window.localStorage.setItem(CLAVE, "1");
    } catch {
      // Ignorado: solo se pierde recordar el cierre.
    }
  }

  if (cerrado) return null;

  return (
    <section
      aria-label={b.aria}
      className="relative flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl bg-primary px-6 py-5 text-primary-foreground shadow-sm"
    >
      <div className="flex min-w-[240px] flex-1 flex-col gap-1">
        <h2 className="font-display text-xl font-bold">{b.titulo}</h2>
        <p className="text-sm text-primary-foreground/80">{b.texto}</p>
      </div>
      <div className="flex flex-wrap items-center gap-8">
        <Cifra valor={propiedades} etiqueta={b.propiedades} locale={locale} />
        <Cifra valor={nuevas48h} etiqueta={b.nuevas} locale={locale} />
        <Cifra valor={brokers} etiqueta={b.brokers} locale={locale} />
      </div>
      <Link
        href="/red"
        className="flex h-[46px] items-center rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 motion-reduce:transition-none"
      >
        {b.explorar}
      </Link>
      <button
        type="button"
        onClick={cerrar}
        aria-label={b.cerrar}
        className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
      >
        <XIcon className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}
