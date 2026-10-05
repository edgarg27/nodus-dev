"use client";

import { CheckIcon, LinkIcon, Share2Icon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "./favorite-button";
import { useContactarPropiedad } from "./use-contactar-propiedad";

interface PropertyContactPanelProps {
  propiedadId: string;
  precio: string;
  titulo: string;
  favorito: boolean;
  autenticado: boolean;
}

// Columna fija de la ficha: precio, Contactar (revela el teléfono del oferente) y compartir.
export function PropertyContactPanel({
  propiedadId,
  precio,
  titulo,
  favorito,
  autenticado,
}: PropertyContactPanelProps) {
  const { contacto, error, enviando, contactar } = useContactarPropiedad(propiedadId);
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
        return;
      } catch {
        // Cancelado o no disponible: se copia la liga.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin acceso al portapapeles no hay nada más que hacer.
    }
  }

  function compartirPorWhatsApp() {
    const texto = encodeURIComponent(`${titulo}: ${window.location.href}`);
    window.open(`https://wa.me/?text=${texto}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_16px_40px_-12px_rgba(11,30,61,0.15)]">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">
          Precio
        </span>
        <span className="font-display text-2xl font-bold text-text">{precio}</span>
      </div>

      {contacto ? (
        <div
          role="status"
          className="flex flex-col gap-1.5 rounded-xl bg-background p-4 text-sm text-text"
        >
          {contacto.telefono ? (
            <>
              <span className="font-semibold">Teléfono del oferente</span>
              <a href={`tel:${contacto.telefono}`} className="text-lg font-bold text-primary">
                {contacto.telefono}
              </a>
              {contacto.whatsappUrl ? (
                <a
                  href={contacto.whatsappUrl}
                  className="text-primary underline underline-offset-4"
                >
                  Escribir por WhatsApp
                </a>
              ) : null}
            </>
          ) : (
            <span>Listo, le enviamos tus datos al oferente. Te contactará pronto.</span>
          )}
        </div>
      ) : null}

      <Button
        type="button"
        disabled={enviando || contacto !== null}
        onClick={() => void contactar()}
        className="h-12 rounded-lg bg-accent text-[15px] font-bold text-accent-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none"
      >
        {contacto ? "Solicitud enviada" : enviando ? "Enviando…" : "Contactar"}
      </Button>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <FavoriteButton
        propiedadId={propiedadId}
        inicial={favorito}
        autenticado={autenticado}
        variante="boton"
      />

      <div className="flex gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => void compartir()}
          className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
        >
          {copiado ? (
            <>
              <CheckIcon className="size-4" aria-hidden="true" />
              Liga copiada
            </>
          ) : (
            <>
              <Share2Icon className="size-4" aria-hidden="true" />
              Compartir
            </>
          )}
        </button>
        <button
          type="button"
          onClick={compartirPorWhatsApp}
          aria-label="Compartir por WhatsApp"
          className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
        >
          <LinkIcon className="size-4" aria-hidden="true" />
          WhatsApp
        </button>
      </div>
    </div>
  );
}
