"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { iniciales } from "@/lib/initials";
import { createClient } from "@/lib/supabase/client";

export interface SiteHeaderActor {
  nombre: string;
  rol: "buscador" | "oferente" | "admin";
  isBroker: boolean;
}

interface SiteHeaderProps {
  actor: SiteHeaderActor | null;
}

function enlacesPorRol(actor: SiteHeaderActor): { href: string; etiqueta: string }[] {
  if (actor.rol === "admin") {
    return [{ href: "/admin/propiedades", etiqueta: "Panel de administración" }];
  }
  if (actor.rol === "oferente") {
    return [
      { href: "/propiedades", etiqueta: "Mis propiedades" },
      { href: "/leads", etiqueta: "Mis leads" },
    ];
  }
  return [{ href: "/buscar", etiqueta: "Buscar espacios" }];
}

export function SiteHeader({ actor }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur"
    >
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="font-display text-xl font-bold text-foreground transition-transform duration-200 ease-out hover:-translate-y-px hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0"
        >
          Nodus
        </Link>

        {actor ? (
          <div ref={userMenuRef} className="relative shrink-0">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex h-11 cursor-pointer items-center gap-2.5 rounded-full py-1 pr-2.5 pl-1 transition-colors hover:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-[13px] font-bold text-primary-foreground">
                {iniciales(actor.nombre)}
              </span>
              <span className="hidden text-sm font-semibold text-foreground sm:inline">
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
                className={`shrink-0 text-muted-foreground transition-transform duration-200 ease-out ${userMenuOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {userMenuOpen ? (
              <div
                role="menu"
                aria-label="Cuenta"
                className="absolute top-[calc(100%+10px)] right-0 flex w-64 flex-col gap-0.5 rounded-2xl border border-border bg-card p-2 shadow-[0_16px_40px_-8px_rgba(11,30,61,0.25)]"
              >
                <div className="mb-1 flex flex-col gap-0.5 border-b border-border px-3 pt-1 pb-3">
                  <span className="text-sm font-bold text-foreground">{actor.nombre}</span>
                </div>
                {enlacesPorRol(actor).map((enlace) => (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {enlace.etiqueta}
                  </Link>
                ))}
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={cerrarSesion}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Cerrar sesión
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
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted md:hidden"
            >
              Menú
            </button>

            <div
              id="site-nav-menu"
              className={
                open
                  ? "absolute inset-x-0 top-full flex flex-col gap-1 border-b border-border bg-card px-4 py-3 shadow-sm md:static md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none"
                  : "hidden md:flex md:items-center md:gap-6"
              }
            >
              <Link
                href="/buscar"
                className="relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-200 after:ease-out after:content-[''] hover:text-foreground hover:after:scale-x-100 focus-visible:text-foreground focus-visible:after:scale-x-100 motion-reduce:after:transition-none md:px-0 md:py-0 md:after:inset-x-0"
              >
                Buscar
              </Link>
              <Link
                href="/sign-in"
                className="relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-200 after:ease-out after:content-[''] hover:text-foreground hover:after:scale-x-100 focus-visible:text-foreground focus-visible:after:scale-x-100 motion-reduce:after:transition-none md:px-0 md:py-0 md:after:inset-x-0"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/sign-up"
                className="flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                Crear cuenta
              </Link>
            </div>
          </>
        )}
      </nav>
    </header>
  );
}
