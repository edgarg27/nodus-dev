"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="flex flex-col gap-2">
      {mensaje ? (
        <p aria-live="polite" className="text-sm text-text-muted">
          {mensaje}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={enviando} onClick={aprobar}>
          Aprobar
        </Button>
        {mostrarMotivo ? (
          <div className="flex w-full flex-col gap-1.5">
            <Label htmlFor={`motivo-denegar-${solicitudId}`}>Motivo (opcional)</Label>
            <Textarea
              id={`motivo-denegar-${solicitudId}`}
              value={motivo}
              onChange={alCambiarMotivo}
            />
            <Button type="button" variant="outline" disabled={enviando} onClick={denegar}>
              Confirmar denegación
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={enviando}
            onClick={() => setMostrarMotivo(true)}
          >
            Denegar
          </Button>
        )}
      </div>
    </div>
  );
}
