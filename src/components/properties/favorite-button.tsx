"use client";

import { cn } from "cn";
import { HeartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";

interface FavoriteButtonProps {
  propiedadId: string;
  inicial: boolean;
  autenticado: boolean;
  // "icono": círculo sobre la foto de una tarjeta. "boton": botón con texto (ficha del espacio).
  variante?: "icono" | "boton";
}

// Marca o quita un favorito al instante y lo confirma con la API; si falla, regresa al estado
// anterior. Sin sesión, manda a iniciar sesión y vuelve a la página actual.
export function FavoriteButton({
  propiedadId,
  inicial,
  autenticado,
  variante = "icono",
}: FavoriteButtonProps) {
  const { t } = useIdioma();
  const router = useRouter();
  const [favorito, setFavorito] = useState(inicial);
  const [enviando, setEnviando] = useState(false);

  async function alternar(evento: React.MouseEvent) {
    evento.stopPropagation();
    evento.preventDefault();
    if (!autenticado) {
      const destino = `${window.location.pathname}${window.location.search}`;
      router.push(`/sign-in?next=${encodeURIComponent(destino)}`);
      return;
    }
    if (enviando) return;

    const nuevo = !favorito;
    setFavorito(nuevo);
    setEnviando(true);
    try {
      const respuesta = nuevo
        ? await fetch("/api/v1/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ propiedad_id: propiedadId }),
          })
        : await fetch(`/api/v1/favorites/${propiedadId}`, { method: "DELETE" });
      if (!respuesta.ok) setFavorito(!nuevo);
    } catch {
      setFavorito(!nuevo);
    } finally {
      setEnviando(false);
    }
  }

  const etiqueta = favorito ? t.favorito.quitar : t.favorito.guardar;

  if (variante === "boton") {
    return (
      <button
        type="button"
        onClick={(evento) => void alternar(evento)}
        aria-pressed={favorito}
        className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
      >
        <HeartIcon
          className={cn("size-4", favorito && "fill-accent text-accent")}
          aria-hidden="true"
        />
        {favorito ? t.favorito.enFavoritos : t.favorito.favorito}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(evento) => void alternar(evento)}
      aria-pressed={favorito}
      aria-label={etiqueta}
      title={etiqueta}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-surface/90 text-text shadow-sm transition-transform duration-150 ease-out hover:scale-110 motion-reduce:transition-none"
    >
      <HeartIcon
        className={cn("size-4", favorito && "fill-accent text-accent")}
        strokeWidth={2.2}
        aria-hidden="true"
      />
    </button>
  );
}
