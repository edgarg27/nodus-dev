"use client";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Boundary del segmento (app): vive dentro del layout raíz, así que el header compartido sigue
// visible cuando este segmento falla. Nunca muestra `error.message` — filtraría detalles internos.
export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <div role="alert">
      <p>Algo salió mal</p>
      <button type="button" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
