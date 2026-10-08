"use client";

import { cn } from "cn";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import type { Textos } from "@/lib/i18n";
import { iniciales } from "@/lib/initials";
import { createClient } from "@/lib/supabase/client";

export interface SiteHeaderActor {
  nombre: string;
  rol: "buscador" | "oferente" | "admin";
  isBroker: boolean;
  // Mensajes sin leer del chat de la Red (solo oferentes).
  mensajesNoLeidos?: number;
}

interface SiteHeaderProps {
  actor: SiteHeaderActor | null;
}

// Distancia de scroll a partir de la cual el header deja de ser transparente en la portada.
const UMBRAL_SCROLL = 40;

const ENLACE_BASE =
  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-200 after:ease-out after:content-[''] hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none md:px-0 md:py-0 md:after:inset-x-0";

interface EnlaceNav {
  href: string;
  etiqueta: string;
  // Contador a la derecha del enlace (por ejemplo, mensajes sin leer).
  insignia?: number;
}

function enlacesPorRol(actor: SiteHeaderActor, t: Textos["header"]): EnlaceNav[] {
  if (actor.rol === "admin") {
    return [{ href: "/admin/propiedades", etiqueta: t.panelAdmin }];
  }
  const guardados = [
    { href: "/favoritos", etiqueta: t.misFavoritos },
    { href: "/mis-busquedas", etiqueta: t.misBusquedas },
  ];
  if (actor.rol === "oferente") {
    return [
      { href: "/panel", etiqueta: t.panel },
      { href: "/propiedades", etiqueta: t.misPropiedades },
      { href: "/leads", etiqueta: t.misLeadsBandeja },
      { href: "/red", etiqueta: t.red },
      { href: "/mensajes", etiqueta: t.mensajes, insignia: actor.mensajesNoLeidos },
      { href: "/perfil", etiqueta: t.miPerfil },
      ...guardados,
    ];
  }
  return [
    { href: "/buscar", etiqueta: t.buscarEspacios },
    { href: "/mensajes", etiqueta: t.mensajes, insignia: actor.mensajesNoLeidos },
    ...guardados,
    { href: "/publicar", etiqueta: t.publicarEspacio },
  ];
}

export function SiteHeader({ actor }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const esPortada = usePathname() === "/";
  const t = useIdioma().t.header;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!esPortada) return;
    function medir() {
      setScrolled(window.scrollY > UMBRAL_SCROLL);
    }
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    return () => window.removeEventListener("scroll", medir);
  }, [esPortada]);

  // En la portada el header flota transparente sobre el video del hero y se vuelve sólido al bajar.
  const inmersivo = esPortada && !scrolled && !open;
  const enlaceClase = cn(
    ENLACE_BASE,
    inmersivo
      ? "text-primary-foreground/85 hover:text-primary-foreground focus-visible:text-primary-foreground"
      : "text-muted-foreground hover:text-foreground focus-visible:text-foreground",
  );

  useEffect(() => {
    if (!open && !userMenuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, userMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (userMenuRef.current?.contains(event.target as Node)) return;
      setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [userMenuOpen]);

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <header
      id="site-header"
      className={cn(
        "top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ease-out motion-reduce:transition-none",
        esPortada ? "fixed inset-x-0" : "sticky",
        inmersivo ? "border-transparent bg-transparent" : "border-border bg-card/90 backdrop-blur",
      )}
    >
      <nav
        aria-label={t.principal}
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          aria-label={`Captive Center by Nodus Flex Center — ${t.inicio}`}
          className="relative block h-11 w-[134px] shrink-0 transition-transform duration-200 ease-out hover:-translate-y-px hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 sm:h-14 sm:w-[170px]"
        >
          {/* Dos versiones del logo apiladas: la de texto blanco sobre el video, la de texto azul en la barra sólida. */}
          <Image
            src="/brand/captive-center-logo-oscuro.png"
            alt=""
            fill
            priority
            sizes="170px"
            className={cn(
              "object-contain transition-opacity duration-300",
              inmersivo ? "opacity-100" : "opacity-0",
            )}
          />
          <Image
            src="/brand/captive-center-logo-claro.png"
            alt=""
            fill
            priority
            sizes="170px"
            className={cn(
              "object-contain transition-opacity duration-300",
              inmersivo ? "opacity-0" : "opacity-100",
            )}
          />
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitch claro={inmersivo} />
          {actor ? (
            <div ref={userMenuRef} className="relative shrink-0">
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className={cn(
                  "flex h-11 cursor-pointer items-center gap-2.5 rounded-full py-1 pr-2.5 pl-1 transition-colors",
                  inmersivo ? "hover:bg-primary-foreground/10" : "hover:bg-muted",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-[13px] font-bold text-primary-foreground">
                  {iniciales(actor.nombre)}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-semibold transition-colors sm:inline",
                    inmersivo ? "text-primary-foreground" : "text-foreground",
                  )}
                >
                  {actor.nombre}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "shrink-0 transition-transform duration-200 ease-out",
                    inmersivo ? "text-primary-foreground/70" : "text-muted-foreground",
                    userMenuOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {userMenuOpen ? (
                <div
                  role="menu"
                  aria-label={t.cuenta}
                  className="absolute top-[calc(100%+10px)] right-0 flex w-64 flex-col gap-0.5 rounded-2xl border border-border bg-card p-2 shadow-[0_16px_40px_-8px_rgba(11,30,61,0.25)]"
                >
                  <div className="mb-1 flex flex-col gap-0.5 border-b border-border px-3 pt-1 pb-3">
                    <span className="text-sm font-bold text-foreground">{actor.nombre}</span>
                  </div>
                  {enlacesPorRol(actor, t).map((enlace) => (
                    <Link
                      key={enlace.href}
                      href={enlace.href}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {enlace.etiqueta}
                      {enlace.insignia ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                          {enlace.insignia}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={cerrarSesion}
                    className="cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {t.cerrarSesion}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <button
                type="button"
                aria-expanded={open}
                aria-controls="site-nav-menu"
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors md:hidden",
                  inmersivo
                    ? "text-primary-foreground hover:bg-primary-foreground/10"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {t.menu}
              </button>

              <div
                id="site-nav-menu"
                className={
                  open
                    ? "absolute inset-x-0 top-full flex flex-col gap-1 border-b border-border bg-card px-4 py-3 shadow-sm md:static md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none"
                    : "hidden md:flex md:items-center md:gap-6"
                }
              >
                <Link href="/buscar" className={enlaceClase}>
                  {t.buscar}
                </Link>
                <Link href="/publicar" className={enlaceClase}>
                  {t.publicarEspacio}
                </Link>
                <Link href="/sign-in" className={enlaceClase}>
                  {t.iniciarSesion}
                </Link>
                <Link
                  href="/sign-up"
                  className="flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {t.crearCuenta}
                </Link>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
