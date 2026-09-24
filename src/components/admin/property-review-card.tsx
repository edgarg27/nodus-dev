"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PropiedadPendienteDeRevision } from "@/server/properties/queries";

interface PropertyReviewCardProps {
  propiedad: PropiedadPendienteDeRevision;
}

type Decision = { decision: "aprobar" } | { decision: "rechazar"; motivo: string };

export function PropertyReviewCard({ propiedad }: PropertyReviewCardProps) {
  const router = useRouter();
  const [mostrarMotivo, setMostrarMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeConflicto, setMensajeConflicto] = useState<string | null>(null);

  async function enviarDecision(decision: Decision) {
    setEnviando(true);
    setMensajeConflicto(null);

    const respuesta = await fetch(`/api/v1/admin/properties/${propiedad.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision),
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      setMensajeConflicto("Esta propiedad ya fue revisada");
    }
    if (respuesta.ok || respuesta.status === 409) {
      router.refresh();
    }
  }

  function alCambiarMotivo(evento: ChangeEvent<HTMLTextAreaElement>) {
    setMotivo(evento.target.value);
  }

  return (
    <article
      className="flex flex-col gap-3 rounded-lg bg-surface p-4 ring-1 ring-border shadow-sm transition-opacity duration-150 ease-out motion-reduce:transition-none aria-busy:opacity-70"
      aria-busy={enviando}
    >
      <h2 className="text-base font-semibold text-text">{propiedad.direccion}</h2>
      <p className="text-sm text-text-muted">
        {propiedad.tipo} · {propiedad.modalidad} · {propiedad.estado} · {propiedad.ciudad}
      </p>
      <p className="text-sm text-text">{propiedad.descripcion}</p>
      <p className="text-sm text-text-muted">
        Lat: {propiedad.lat} · Lng: {propiedad.lng}
      </p>

      {propiedad.fotos.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {propiedad.fotos.map((foto) => (
            <li key={foto.id}>
              {/* biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático */}
              <img
                src={foto.storageUrl}
                alt={`${propiedad.direccion} — ${propiedad.tipo}`}
                width={120}
                height={120}
                className="rounded-lg border border-border object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      {propiedad.oferente ? (
        <p className="text-sm text-text-muted">
          {propiedad.oferente.nombre} · {propiedad.oferente.email}
          {propiedad.oferente.telefono ? ` · ${propiedad.oferente.telefono}` : ""}
          {propiedad.oferente.isBroker ? " · Broker" : ""}
        </p>
      ) : null}

      {mensajeConflicto ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {mensajeConflicto}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={enviando}
          onClick={() => enviarDecision({ decision: "aprobar" })}
        >
          Aprobar
        </Button>

        {mostrarMotivo ? (
          <div className="flex w-full flex-col gap-1.5">
            <Label htmlFor={`motivo-${propiedad.id}`}>Motivo (obligatorio)</Label>
            <Textarea id={`motivo-${propiedad.id}`} value={motivo} onChange={alCambiarMotivo} />
            <Button
              type="button"
              variant="destructive"
              disabled={enviando || motivo.trim().length === 0}
              onClick={() => enviarDecision({ decision: "rechazar", motivo })}
            >
              Confirmar rechazo
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={enviando}
            onClick={() => setMostrarMotivo(true)}
          >
            Rechazar
          </Button>
        )}
      </div>
    </article>
  );
}
