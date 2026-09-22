"use client";

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
    <header>
      <nav aria-label="Principal">
        <a href="/">Nodus</a>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="site-nav-menu"
          onClick={() => setOpen((prev) => !prev)}
          className="md:hidden"
        >
          Menú
        </button>
        <div id="site-nav-menu" className={open ? "block" : "hidden md:block"}>
          <a href="/buscar">Buscar</a>
          <a href="/sign-in">Iniciar sesión</a>
          <a href="/sign-up">Crear cuenta</a>
        </div>
      </nav>
    </header>
  );
}
