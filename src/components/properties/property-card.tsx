"use client";

import Link from "next/link";
import type { KeyboardEvent } from "react";
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
}

export function PropertyCard({ propiedad, selected, onSelect }: PropertyCardProps) {
  function alPresionarTecla(evento: KeyboardEvent<HTMLElement>) {
    if (!onSelect) return;
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      onSelect();
    }
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
    </article>
  );
}
