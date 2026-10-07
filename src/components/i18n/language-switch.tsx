"use client";

import { cn } from "cn";
import { useRouter } from "next/navigation";
import { COOKIE_IDIOMA, type Idioma } from "@/lib/i18n";
import { useIdioma } from "./idioma-provider";

// Selector ES | EN: guarda el idioma en una cookie por un año y vuelve a renderizar la página en
// el servidor con el idioma nuevo.
export function LanguageSwitch({ claro = false }: { claro?: boolean }) {
  const router = useRouter();
  const { idioma, t } = useIdioma();

  function cambiar(nuevo: Idioma) {
    if (nuevo === idioma) return;
    // biome-ignore lint/suspicious/noDocumentCookie: preferencia de idioma no sensible, leída por el servidor
    document.cookie = `${COOKIE_IDIOMA}=${nuevo}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <fieldset
      aria-label={t.idioma.cambiar}
      className={cn(
        "flex items-center rounded-full border p-0.5 text-xs font-bold",
        claro ? "border-primary-foreground/40" : "border-border",
      )}
    >
      {(["es", "en"] as const).map((opcion) => (
        <button
          key={opcion}
          type="button"
          lang={opcion}
          aria-pressed={idioma === opcion}
          title={t.idioma[opcion]}
          onClick={() => cambiar(opcion)}
          className={cn(
            "cursor-pointer rounded-full px-2 py-1 uppercase transition-colors",
            idioma === opcion
              ? "bg-accent text-accent-foreground"
              : claro
                ? "text-primary-foreground/80 hover:text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opcion}
        </button>
      ))}
    </fieldset>
  );
}
