"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="relative border-b border-border bg-card">
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
      </nav>
    </header>
  );
}
