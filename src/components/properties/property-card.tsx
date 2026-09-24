"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { type EstadoPublicacion, StatusBadge } from "./status-badge";

export interface PropertyCardData {
  id: string;
  direccion: string;
  tipo: string;
  modalidad: string;
  ciudad: string;
  estadoPublicacion: EstadoPublicacion;
  motivoRechazo: string | null;
}

interface PropertyCardProps {
  propiedad: PropertyCardData;
  selected?: boolean;
  onSelect?: () => void;
  permitirContacto?: boolean;
}

interface ContactoRevelado {
  telefono: string | null;
  whatsappUrl: string | null;
}

export function PropertyCard({
  propiedad,
  selected,
  onSelect,
  permitirContacto,
}: PropertyCardProps) {
  const router = useRouter();
  const [contacto, setContacto] = useState<ContactoRevelado | null>(null);
  const [errorContacto, setErrorContacto] = useState<string | null>(null);

  async function alContactar(evento: MouseEvent<HTMLButtonElement>) {
    evento.stopPropagation();
    setErrorContacto(null);

    const respuesta = await fetch("/api/v1/contact-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propiedad_id: propiedad.id, quiere_financiamiento: false }),
    });

    if (respuesta.status === 401) {
      router.push("/sign-in");
      return;
    }

    const cuerpo = await respuesta.json();
    if (!respuesta.ok) {
      setErrorContacto(cuerpo.error?.message ?? "No se pudo contactar");
      return;
    }

    setContacto({ telefono: cuerpo.data.telefono_oferente, whatsappUrl: cuerpo.data.whatsapp_url });
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: onClick aquí es solo conveniencia de mouse (área completa de la tarjeta); el teclado selecciona con el botón del encabezado, sin anidar controles interactivos bajo un role="button".
    <article
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className="flex flex-col gap-2 rounded-lg bg-surface p-4 ring-1 ring-border shadow-sm transition-colors aria-[current=true]:ring-2 aria-[current=true]:ring-ring"
    >
      <h3 className="text-base font-semibold text-text">
        {onSelect ? (
          <button
            type="button"
            onClick={(evento) => {
              evento.stopPropagation();
              onSelect();
            }}
            className="text-left underline-offset-4 hover:underline"
          >
            {propiedad.direccion}
          </button>
        ) : (
          propiedad.direccion
        )}
      </h3>
      <p className="text-sm text-text-muted">
        {propiedad.tipo} · {propiedad.modalidad} · {propiedad.ciudad}
      </p>
      <StatusBadge estado={propiedad.estadoPublicacion} />
      {propiedad.estadoPublicacion === "rechazada" ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-destructive">{propiedad.motivoRechazo}</p>
          <Link
            href={`/propiedades/${propiedad.id}/editar`}
            className="text-sm text-primary underline underline-offset-4"
          >
            Corregir y reenviar
          </Link>
        </div>
      ) : null}
      {permitirContacto ? (
        <div className="flex flex-col gap-1.5">
          {contacto ? (
            <p className="text-sm text-text">
              {contacto.telefono}
              {contacto.whatsappUrl ? (
                <a
                  href={contacto.whatsappUrl}
                  className="ml-1.5 text-primary underline underline-offset-4"
                >
                  Escribir por WhatsApp
                </a>
              ) : null}
            </p>
          ) : (
            <Button type="button" size="sm" onClick={alContactar}>
              Contactar
            </Button>
          )}
          {errorContacto ? (
            <Alert variant="destructive">
              <AlertDescription>{errorContacto}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
