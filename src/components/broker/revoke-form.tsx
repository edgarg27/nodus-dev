"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";

interface RevokeFormProps {
  usuarioId: string;
}

export function RevokeForm({ usuarioId }: RevokeFormProps) {
  const router = useRouter();
  const [mostrarMotivo, setMostrarMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function revocar() {
    setEnviando(true);
    setMensaje(null);

    const respuesta = await fetch(`/api/v1/admin/brokers/${usuarioId}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      setMensaje("Este usuario ya no es broker");
      router.refresh();
      return;
    }
    if (respuesta.ok) {
      router.refresh();
    }
  }

  function alCambiarMotivo(evento: ChangeEvent<HTMLTextAreaElement>) {
    setMotivo(evento.target.value);
  }

  return (
    <div>
      {mensaje ? <p aria-live="polite">{mensaje}</p> : null}
      {mostrarMotivo ? (
        <div>
          <label htmlFor={`motivo-revocar-${usuarioId}`}>Motivo (obligatorio)</label>
          <textarea id={`motivo-revocar-${usuarioId}`} value={motivo} onChange={alCambiarMotivo} />
          <button type="button" disabled={enviando || motivo.trim().length === 0} onClick={revocar}>
            Confirmar revocación
          </button>
        </div>
      ) : (
        <button type="button" disabled={enviando} onClick={() => setMostrarMotivo(true)}>
          Revocar
        </button>
      )}
    </div>
  );
}
