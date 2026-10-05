"use client";

import { cn } from "cn";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LocationAutocomplete } from "./location-autocomplete";

const MODALIDADES = [
  { value: "renta", etiqueta: "Renta" },
  { value: "venta", etiqueta: "Compra" },
  { value: "desde_cero", etiqueta: "Proyecto desde cero" },
] as const;

const TIPOS = [
  { value: "nave_industrial", etiqueta: "Nave industrial" },
  { value: "oficina", etiqueta: "Oficina" },
  { value: "local_comercial", etiqueta: "Local comercial" },
] as const;

// Grano fino sobre el video de fondo: disimula que la fuente es de baja resolución.
const GRANO = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>',
)}")`;

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
        className="h-[46px] rounded-[10px] border border-input bg-background px-3.5 text-[15px] text-foreground"
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
        className="h-[46px] rounded-[10px] border border-input bg-background px-3.5 text-[15px] text-foreground"
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

function CampoFinanciamiento({ className }: { className: string }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
      <legend className="mb-2 p-0 text-[13px] font-semibold text-foreground">
        ¿Financiamiento?
      </legend>
      <div className={cn("flex h-[46px] items-center", className)}>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="radio" name="financiamiento" value="true" className="accent-primary" />
          Sí
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="radio"
            name="financiamiento"
            value="false"
            defaultChecked
            className="accent-primary"
          />
          No
        </label>
      </div>
    </fieldset>
  );
}

function CampoUbicacion({ id, flotante }: { id: string; flotante: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        Ubicación
      </label>
      <LocationAutocomplete
        id={id}
        placeholder="Ciudad, zona o código postal"
        flotante={flotante}
      />
    </div>
  );
}

export function SearchHero() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
    function aplicar() {
      if (!video) return;
      if (reducirMovimiento.matches) video.pause();
      else void video.play().catch(() => {});
    }
    aplicar();
    reducirMovimiento.addEventListener("change", aplicar);
    return () => reducirMovimiento.removeEventListener("change", aplicar);
  }, []);

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
        className="relative isolate flex items-end justify-center overflow-hidden border-b border-border bg-primary px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8"
        // El header de la portada es fijo y transparente: el hero ocupa toda la pantalla por debajo de él.
        style={{ minHeight: "100dvh", paddingTop: `calc(${headerHeight}px + 3.5rem)` }}
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src="/videos/hero.mp4"
            poster="/videos/hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
          <div
            className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
            style={{ backgroundImage: GRANO, backgroundSize: "160px 160px" }}
          />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
        </div>
        <div className="flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
          <div className="text-primary-foreground [text-shadow:0_2px_16px_rgb(0_0_0/0.35)]">
            <h1 className="text-[34px] leading-tight font-bold sm:text-[44px]">
              Encuentra el espacio para hacer crecer tu negocio
            </h1>
            <p className="mt-3 text-[17px] text-primary-foreground/90 sm:text-lg">
              Naves industriales, oficinas y locales comerciales en San Luis Potosí, Aguascalientes
              y León.
            </p>
          </div>
          <form
            action="/buscar"
            method="get"
            className="w-full rounded-2xl border border-white/30 bg-card/85 p-4 shadow-lg backdrop-blur-md sm:p-5"
          >
            <div className="grid grid-cols-1 items-end gap-x-5 gap-y-5 min-[480px]:grid-cols-2 min-[480px]:gap-y-4 lg:grid-cols-12 lg:gap-y-[18px]">
              <div className="lg:col-span-3">
                <CampoModalidad id="hero-modalidad" />
              </div>
              <div className="lg:col-span-3">
                <CampoTipo id="hero-tipo" />
              </div>
              <div className="lg:col-span-3">
                <CampoUbicacion id="hero-ubicacion" flotante />
              </div>
              <div className="lg:col-span-2">
                <CampoFinanciamiento className="gap-3.5" />
              </div>
              <button
                type="submit"
                aria-label="Buscar espacios"
                className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 min-[480px]:col-span-2 lg:col-span-1"
              >
                <SearchIcon />
              </button>
            </div>
          </form>
        </div>
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
          <form
            action="/buscar"
            method="get"
            className="flex w-full max-w-[860px] items-center gap-4"
          >
            <select
              name="modalidad"
              defaultValue=""
              aria-label="Modalidad"
              className="h-[42px] w-[170px] shrink-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
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
              className="h-[42px] w-[170px] shrink-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">Cualquiera</option>
              {TIPOS.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
            <LocationAutocomplete
              placeholder="Ubicación"
              ariaLabel="Ubicación"
              compacto
              flotante
              className="max-w-[420px] flex-grow"
            />
            <button
              type="submit"
              className="flex h-[42px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-6 text-sm font-bold text-accent-foreground transition-all duration-150 ease-out hover:bg-accent/90"
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
            <DialogContent
              showCloseButton={false}
              className="top-auto bottom-0 max-h-[88dvh] max-w-[480px] translate-y-0 gap-0 overflow-y-auto rounded-t-[20px] rounded-b-none bg-card px-5 pt-6 pb-7 shadow-[0_-16px_40px_rgba(11,30,59,0.25)] sm:max-w-[480px]"
            >
              <DialogHeader className="mb-5 flex-row items-center justify-between gap-2">
                <DialogTitle className="font-display text-lg font-bold text-foreground">
                  Buscar espacios
                </DialogTitle>
                <DialogClose asChild>
                  <button
                    type="button"
                    aria-label="Cerrar buscador"
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-background transition-transform duration-150 ease-out hover:-translate-y-px active:scale-[0.94] motion-reduce:transition-none"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </DialogClose>
              </DialogHeader>
              <form action="/buscar" method="get" className="flex flex-col gap-4">
                <CampoModalidad id="modal-modalidad" />
                <CampoTipo id="modal-tipo" />
                <CampoUbicacion id="modal-ubicacion" flotante={false} />
                <CampoFinanciamiento className="gap-5" />
                <button
                  type="submit"
                  className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent font-bold text-accent-foreground transition-colors hover:bg-accent/90"
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
