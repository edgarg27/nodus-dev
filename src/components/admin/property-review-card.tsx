"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
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
    <article>
      <h2>{propiedad.direccion}</h2>
      <p>
        {propiedad.tipo} · {propiedad.modalidad} · {propiedad.estado} · {propiedad.ciudad}
      </p>
      <p>{propiedad.descripcion}</p>
      <p>
        Lat: {propiedad.lat} · Lng: {propiedad.lng}
      </p>

      {propiedad.fotos.length > 0 ? (
        <ul>
          {propiedad.fotos.map((foto) => (
            <li key={foto.id}>
              {/* biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático */}
              <img
                src={foto.storageUrl}
                alt={`${propiedad.direccion} — ${propiedad.tipo}`}
                width={120}
                height={120}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {propiedad.oferente ? (
        <p>
          {propiedad.oferente.nombre} · {propiedad.oferente.email}
          {propiedad.oferente.telefono ? ` · ${propiedad.oferente.telefono}` : ""}
          {propiedad.oferente.isBroker ? " · Broker" : ""}
        </p>
      ) : null}

      {mensajeConflicto ? <p aria-live="polite">{mensajeConflicto}</p> : null}

      <button
        type="button"
        disabled={enviando}
        onClick={() => enviarDecision({ decision: "aprobar" })}
      >
        Aprobar
      </button>

      {mostrarMotivo ? (
        <div>
          <label htmlFor={`motivo-${propiedad.id}`}>Motivo (obligatorio)</label>
          <textarea id={`motivo-${propiedad.id}`} value={motivo} onChange={alCambiarMotivo} />
          <button
            type="button"
            disabled={enviando || motivo.trim().length === 0}
            onClick={() => enviarDecision({ decision: "rechazar", motivo })}
          >
            Confirmar rechazo
          </button>
        </div>
      ) : (
        <button type="button" disabled={enviando} onClick={() => setMostrarMotivo(true)}>
          Rechazar
        </button>
      )}
    </article>
  );
}
