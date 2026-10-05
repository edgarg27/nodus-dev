"use client";

import { cn } from "cn";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MODALIDADES = [
  { value: "renta", etiqueta: "Renta" },
  { value: "venta", etiqueta: "Venta" },
  { value: "desde_cero", etiqueta: "Proyecto desde cero" },
] as const;

const TIPOS = [
  { value: "nave_industrial", etiqueta: "Nave industrial" },
  { value: "oficina", etiqueta: "Oficina" },
  { value: "local_comercial", etiqueta: "Local comercial" },
] as const;

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CampoModalidad({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        Modalidad
      </label>
      <select
        id={id}
        name="modalidad"
        defaultValue=""
        className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-[15px] text-foreground"
      >
        <option value="">Cualquiera</option>
        {MODALIDADES.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoTipo({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        Tipo de inmueble
      </label>
      <select
        id={id}
        name="tipo"
        defaultValue=""
        className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-[15px] text-foreground"
      >
        <option value="">Cualquiera</option>
        {TIPOS.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoFinanciamiento({ id }: { id: string }) {
  return (
    <fieldset className="flex items-center gap-5 border-0 p-0">
      <legend className="sr-only">¿Financiamiento?</legend>
      <span id={id} className="text-[13px] font-semibold text-foreground">
        ¿Financiamiento?
      </span>
      <label className="flex items-center gap-2 text-[15px] text-foreground">
        <input
          type="radio"
          name="financiamiento"
          value="true"
          aria-labelledby={id}
          className="accent-primary"
        />
        Sí
      </label>
      <label className="flex items-center gap-2 text-[15px] text-foreground">
        <input type="radio" name="financiamiento" value="false" className="accent-primary" />
        No
      </label>
    </fieldset>
  );
}

function CampoUbicacion({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        Ubicación
      </label>
      <input
        id={id}
        name="ciudad"
        type="text"
        placeholder="Ciudad o zona"
        className="h-[46px] rounded-lg border border-input bg-background px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function SearchHero() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function medir() {
      const header = document.getElementById("site-header");
      if (header) setHeaderHeight(header.getBoundingClientRect().height);
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      (entradas) => {
        const entrada = entradas[0];
        if (entrada) setStuck(!entrada.isIntersecting);
      },
      { rootMargin: `-${headerHeight + 1}px 0px 0px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [headerHeight]);

  return (
    <>
      <section
        id="buscar"
        className="flex items-center justify-center border-b border-border bg-gradient-to-b from-card to-background px-4 py-14 sm:px-6 lg:px-8"
        style={{ minHeight: `calc(100dvh - ${headerHeight}px)` }}
      >
        <form
          action="/buscar"
          method="get"
          className="w-full max-w-3xl rounded-2xl border border-border bg-card p-7 shadow-[0_24px_48px_-12px_rgba(11,30,61,0.10)] sm:p-8"
        >
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_auto]">
            <CampoModalidad id="hero-modalidad" />
            <CampoTipo id="hero-tipo" />
            <CampoUbicacion id="hero-ubicacion" />
            <button
              type="submit"
              aria-label="Buscar espacios"
              className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-6 font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:col-span-2 lg:col-span-1 lg:w-auto"
            >
              <SearchIcon />
              <span className="lg:hidden">Buscar</span>
            </button>
          </div>
          <div className="mt-5">
            <CampoFinanciamiento id="hero-financiamiento" />
          </div>
        </form>
      </section>

      <div ref={sentinelRef} aria-hidden="true" />

      <div
        className={cn(
          "sticky z-30 overflow-hidden border-b border-border bg-card transition-[max-height,box-shadow] duration-200 ease-out",
          stuck ? "max-h-24 shadow-md" : "max-h-0 border-b-0 shadow-none",
        )}
        style={{ top: headerHeight }}
      >
        <div className="mx-auto hidden max-w-7xl items-center justify-center px-4 py-3 sm:px-6 md:flex lg:px-8">
          <form action="/buscar" method="get" className="flex w-full max-w-3xl items-center gap-3">
            <select
              name="modalidad"
              defaultValue=""
              aria-label="Modalidad"
              className="h-[42px] w-40 shrink-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">Cualquiera</option>
              {MODALIDADES.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
            <select
              name="tipo"
              defaultValue=""
              aria-label="Tipo de inmueble"
              className="h-[42px] w-40 shrink-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">Cualquiera</option>
              {TIPOS.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
            <input
              name="ciudad"
              type="text"
              placeholder="Ubicación"
              aria-label="Ubicación"
              className="h-[42px] max-w-md flex-grow rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="flex h-[42px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground transition-all duration-150 ease-out hover:bg-accent/90"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="mx-auto flex max-w-7xl justify-center px-4 py-3 sm:px-6 md:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex h-11 w-full max-w-sm cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-bold text-foreground transition-colors hover:border-foreground"
              >
                <span className="text-accent">
                  <SearchIcon />
                </span>
                Buscar espacios
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buscar espacios</DialogTitle>
              </DialogHeader>
              <form action="/buscar" method="get" className="flex flex-col gap-4">
                <CampoModalidad id="modal-modalidad" />
                <CampoTipo id="modal-tipo" />
                <CampoUbicacion id="modal-ubicacion" />
                <CampoFinanciamiento id="modal-financiamiento" />
                <button
                  type="submit"
                  className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent font-bold text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  <SearchIcon />
                  Buscar espacios
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
