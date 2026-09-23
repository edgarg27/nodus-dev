"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, type MouseEvent, useState } from "react";
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

  function alPresionarTecla(evento: KeyboardEvent<HTMLElement>) {
    if (!onSelect) return;
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      onSelect();
    }
  }

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
    <article
      aria-current={selected ? "true" : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={onSelect ? alPresionarTecla : undefined}
    >
      <h3>{propiedad.direccion}</h3>
      <p>
        {propiedad.tipo} · {propiedad.modalidad} · {propiedad.ciudad}
      </p>
      <StatusBadge estado={propiedad.estadoPublicacion} />
      {propiedad.estadoPublicacion === "rechazada" ? (
        <div>
          <p>{propiedad.motivoRechazo}</p>
          <Link href={`/propiedades/${propiedad.id}/editar`}>Corregir y reenviar</Link>
        </div>
      ) : null}
      {permitirContacto ? (
        <div>
          {contacto ? (
            <p>
              {contacto.telefono}
              {contacto.whatsappUrl ? (
                <a href={contacto.whatsappUrl}>Escribir por WhatsApp</a>
              ) : null}
            </p>
          ) : (
            <button type="button" onClick={alContactar}>
              Contactar
            </button>
          )}
          {errorContacto ? <p role="alert">{errorContacto}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
