"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";

interface RequestActionsProps {
  solicitudId: string;
}

export function RequestActions({ solicitudId }: RequestActionsProps) {
  const router = useRouter();
  const [mostrarMotivo, setMostrarMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function aprobar() {
    setEnviando(true);
    setMensaje(null);

    const respuesta = await fetch(`/api/v1/admin/broker-requests/${solicitudId}/approve`, {
      method: "POST",
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      setMensaje("Esta solicitud ya fue resuelta");
      router.refresh();
      return;
    }

    const cuerpo = await respuesta.json();
    if (respuesta.ok) {
      setMensaje(`Broker aprobado con código ${cuerpo.data.broker_code}`);
      router.refresh();
    }
  }

  async function denegar() {
    setEnviando(true);
    setMensaje(null);

    const respuesta = await fetch(`/api/v1/admin/broker-requests/${solicitudId}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(motivo.trim() ? { motivo } : {}),
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      setMensaje("Esta solicitud ya fue resuelta");
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
      <button type="button" disabled={enviando} onClick={aprobar}>
        Aprobar
      </button>
      {mostrarMotivo ? (
        <div>
          <label htmlFor={`motivo-denegar-${solicitudId}`}>Motivo (opcional)</label>
          <textarea
            id={`motivo-denegar-${solicitudId}`}
            value={motivo}
            onChange={alCambiarMotivo}
          />
          <button type="button" disabled={enviando} onClick={denegar}>
            Confirmar denegación
          </button>
        </div>
      ) : (
        <button type="button" disabled={enviando} onClick={() => setMostrarMotivo(true)}>
          Denegar
        </button>
      )}
    </div>
  );
}
