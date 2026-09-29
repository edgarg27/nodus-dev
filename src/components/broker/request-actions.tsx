"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { Button } from "@/components/ui/button";
import { iniciales } from "@/lib/initials";

interface Solicitud {
  id: string;
  mensaje: string;
  createdAt: Date;
  usuario: {
    nombre: string;
    email: string;
    telefono: string | null;
  };
}

interface RequestActionsProps {
  solicitud: Solicitud;
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function RequestActions({ solicitud }: RequestActionsProps) {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [enviando, setEnviando] = useState(false);

  async function aprobar() {
    setEnviando(true);

    const respuesta = await fetch(`/api/v1/admin/broker-requests/${solicitud.id}/approve`, {
      method: "POST",
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      showToast("Esta solicitud ya fue resuelta.");
      router.refresh();
      return;
    }

    const cuerpo = await respuesta.json();
    if (respuesta.ok) {
      showToast(`Solicitud aprobada — código ${cuerpo.data.broker_code} generado.`);
      router.refresh();
    }
  }

  async function denegar() {
    setEnviando(true);

    const respuesta = await fetch(`/api/v1/admin/broker-requests/${solicitud.id}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      showToast("Esta solicitud ya fue resuelta.");
      router.refresh();
      return;
    }
    if (respuesta.ok) {
      showToast("Solicitud de broker denegada.");
      router.refresh();
    }
  }

  return (
    <article
      className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-4 aria-busy:opacity-70 max-md:flex-col max-md:items-start"
      aria-busy={enviando}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background font-display text-sm font-bold text-text">
        {iniciales(solicitud.usuario.nombre)}
      </span>

      <div className="flex min-w-0 grow flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-text">{solicitud.usuario.nombre}</h3>
        <p className="text-sm text-text-muted">
          {solicitud.usuario.email}
          {solicitud.usuario.telefono ? ` · ${solicitud.usuario.telefono}` : ""}
        </p>
        <p className="text-sm text-text italic">“{solicitud.mensaje}”</p>
        <p className="text-xs text-text-muted">
          Solicitado el {FORMATO_FECHA.format(solicitud.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 max-md:w-full max-md:flex-wrap">
        <Button type="button" variant="outline" disabled={enviando} onClick={denegar}>
          Denegar
        </Button>
        <Button type="button" disabled={enviando} onClick={aprobar}>
          Aprobar
        </Button>
      </div>
    </article>
  );
}
