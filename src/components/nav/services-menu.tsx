"use client";

import { cn } from "cn";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { ServicioIcono } from "@/components/servicios/servicio-icono";
import { SERVICIOS } from "@/lib/servicios";

interface ServicesMenuProps {
  // Misma clase que los demás enlaces del header (cambia sobre el video de la portada).
  className: string;
}

// Botón "Servicios" del header: abre un panel con cada servicio de Captive; cada uno lleva a su
// sección en /servicios.
export function ServicesMenu({ className }: ServicesMenuProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useIdioma();

  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAbierto(false);
    }
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (ref.current?.contains(event.target as Node)) return;
      setAbierto(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [abierto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls="menu-servicios"
        onClick={() => setAbierto((prev) => !prev)}
        className={cn(className, "flex cursor-pointer items-center gap-1")}
      >
        {t.header.servicios}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("transition-transform duration-200 ease-out", abierto && "rotate-180")}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {abierto ? (
        <div
          id="menu-servicios"
          role="menu"
          aria-label={t.header.servicios}
          className="absolute top-[calc(100%+16px)] left-1/2 flex w-80 -translate-x-1/2 flex-col gap-0.5 rounded-2xl border border-border bg-card p-2 shadow-[0_16px_40px_-8px_rgba(11,30,61,0.25)]"
        >
          {SERVICIOS.map((servicio) => {
            const textos = t.servicios.items[servicio.clave];
            return (
              <Link
                key={servicio.clave}
                href={`/servicios#${servicio.ancla}`}
                role="menuitem"
                onClick={() => setAbierto(false)}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <ServicioIcono clave={servicio.clave} className="size-[18px]" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{textos.titulo}</span>
                  <span className="text-xs text-muted-foreground">{textos.resumen}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
