"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Button } from "@/components/ui/button";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";

// Tras una denegación: vuelve a mandar la verificación a revisión con los documentos actuales.
export function ResubmitButton({ disabled }: { disabled: boolean }) {
  const { idioma, t: textos } = useIdioma();
  const t = textos.verificacion;
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reenviar() {
    setError(null);
    setEnviando(true);
    const respuesta = await fetch("/api/v1/verificacion/reenviar", { method: "POST" }).catch(
      () => null,
    );
    setEnviando(false);
    // 409: ya hay una revisión abierta; refrescar muestra el estado real.
    if (!respuesta?.ok && respuesta?.status !== 409) {
      const detalle = await respuesta?.json().catch(() => null);
      setError(mensajeDeErrorApi(detalle, idioma, t.errorReenvio));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" disabled={disabled || enviando} onClick={reenviar}>
        {enviando ? t.reenviando : t.reenviar}
      </Button>
      {error ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
