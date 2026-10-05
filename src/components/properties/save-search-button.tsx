"use client";

import { BookmarkCheckIcon, BookmarkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SaveSearchButtonProps {
  consulta: string;
  guardadaInicial: boolean;
  autenticado: boolean;
}

// "Guardar búsqueda" en la barra de resultados. Guardar es idempotente en la API; una vez
// guardada, el botón lleva a "Mis búsquedas".
export function SaveSearchButton({
  consulta,
  guardadaInicial,
  autenticado,
}: SaveSearchButtonProps) {
  const router = useRouter();
  const [guardada, setGuardada] = useState(guardadaInicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!autenticado) {
      const destino = `${window.location.pathname}${window.location.search}`;
      router.push(`/sign-in?next=${encodeURIComponent(destino)}`);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/v1/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consulta }),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (respuesta.ok) setGuardada(true);
      else setError(cuerpo?.error?.message ?? "No se pudo guardar la búsqueda.");
    } catch {
      setError("No se pudo guardar la búsqueda.");
    } finally {
      setEnviando(false);
    }
  }

  const clase =
    "flex h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3.5 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary disabled:opacity-60";

  return (
    <div className="relative">
      {guardada ? (
        <Link href="/mis-busquedas" className={clase}>
          <BookmarkCheckIcon className="size-[17px] text-accent" aria-hidden="true" />
          <span className="hidden sm:inline">Búsqueda guardada</span>
        </Link>
      ) : (
        <button
          type="button"
          disabled={enviando}
          onClick={() => void guardar()}
          aria-label="Guardar búsqueda"
          className={clase}
        >
          <BookmarkIcon className="size-[17px]" aria-hidden="true" />
          <span className="hidden sm:inline">{enviando ? "Guardando…" : "Guardar búsqueda"}</span>
        </button>
      )}
      {error ? (
        <p
          role="alert"
          className="absolute top-[calc(100%+6px)] right-0 z-20 w-64 rounded-lg bg-destructive px-3 py-2 text-xs text-primary-foreground shadow-md"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
