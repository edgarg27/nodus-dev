"use client";

import { useIdioma } from "@/components/i18n/idioma-provider";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Boundary del segmento (app): vive dentro del layout raíz, así que el header compartido sigue
// visible cuando este segmento falla. Nunca muestra `error.message` — filtraría detalles internos.
export default function ErrorPage({ reset }: ErrorPageProps) {
  const { t } = useIdioma();
  return (
    <div role="alert">
      <p>{t.panel.error.titulo}</p>
      <button type="button" onClick={reset}>
        {t.panel.error.reintentar}
      </button>
    </div>
  );
}
