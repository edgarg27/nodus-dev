"use client";

import { Building2Icon, StoreIcon, WarehouseIcon } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  type DetallesPropiedad,
  ETIQUETA_MODALIDAD,
  ETIQUETA_TIPO,
  formatearPrecio,
  resumenDetalles,
} from "@/lib/property-details";
import { FavoriteButton } from "./favorite-button";
import { useContactarPropiedad } from "./use-contactar-propiedad";

export interface PropertyResultData extends DetallesPropiedad {
  id: string;
  direccion: string;
  tipo: string;
  modalidad: string;
  estado: string;
  ciudad: string;
  descripcion: string;
  fotoUrl: string | null;
}

interface PropertyResultCardProps {
  propiedad: PropertyResultData;
  numero: number;
  selected: boolean;
  onSelect: () => void;
  favorito?: boolean;
  autenticado?: boolean;
}

const ICONO_POR_TIPO = {
  nave_industrial: WarehouseIcon,
  oficina: Building2Icon,
  local_comercial: StoreIcon,
} as const;

export function PropertyResultCard({
  propiedad,
  numero,
  selected,
  onSelect,
  favorito = false,
  autenticado = false,
}: PropertyResultCardProps) {
  const {
    contacto,
    error: errorContacto,
    enviando,
    contactar,
  } = useContactarPropiedad(propiedad.id);

  const Icono = ICONO_POR_TIPO[propiedad.tipo as keyof typeof ICONO_POR_TIPO] ?? WarehouseIcon;
  const etiquetas = resumenDetalles(propiedad, propiedad.tipo);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: onClick aquí es solo conveniencia de mouse (resalta la tarjeta y su pin en el mapa); Contactar (botón) y Ver detalles (liga a la ficha) ya tienen su propio foco y activación por teclado.
    <article
      id={`listing-${propiedad.id}`}
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex cursor-pointer scroll-mt-32 flex-col overflow-hidden rounded-2xl border-2 bg-surface transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none ${
        selected ? "border-accent shadow-[0_0_0_3px_rgba(255,122,69,0.22)]" : "border-border"
      }`}
    >
      <div className="relative flex h-[150px] shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/70 to-primary">
        {propiedad.fotoUrl ? (
          // biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático
          <img src={propiedad.fotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icono
            className="size-12 text-primary-foreground/50"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
          {ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad}
        </span>
        <span className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">
          {numero}
        </span>
        <div className="absolute right-3 bottom-3">
          <FavoriteButton propiedadId={propiedad.id} inicial={favorito} autenticado={autenticado} />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-[18px]">
        <span className="text-[11px] font-semibold tracking-wide text-warning uppercase">
          {ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo}
        </span>
        <p className="font-display text-lg font-bold text-text">
          {formatearPrecio(propiedad, propiedad.modalidad)}
        </p>
        {etiquetas.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Datos del espacio">
            {etiquetas.map((etiqueta) => (
              <li
                key={etiqueta}
                className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-text-muted"
              >
                {etiqueta}
              </li>
            ))}
          </ul>
        ) : null}
        <h3 className="text-base font-semibold text-text">{propiedad.direccion}</h3>
        <p className="text-[13px] text-text-muted">
          {propiedad.ciudad}, {propiedad.estado}
        </p>

        {contacto && !contacto.telefono ? (
          // El oferente aún no tiene teléfono registrado; la solicitud ya quedó en sus leads.
          <p role="status" className="pt-1 text-sm text-text">
            Listo, le enviamos tus datos al oferente. Te contactará pronto.
          </p>
        ) : contacto ? (
          <p role="status" className="pt-1 text-sm text-text">
            {contacto.telefono}
            {contacto.whatsappUrl ? (
              <a
                href={contacto.whatsappUrl}
                onClick={(evento) => evento.stopPropagation()}
                className="ml-1.5 text-primary underline underline-offset-4"
              >
                Escribir por WhatsApp
              </a>
            ) : null}
          </p>
        ) : null}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            disabled={enviando || contacto !== null}
            className="h-9 flex-1 gap-0 rounded-lg bg-accent px-3 text-[13px] font-bold text-accent-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none"
            onClick={(evento) => {
              evento.stopPropagation();
              void contactar();
            }}
          >
            {contacto ? "Solicitud enviada" : enviando ? "Enviando…" : "Contactar"}
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-9 flex-1 gap-0 rounded-lg border-input px-3 text-[13px] font-bold text-text transition-transform duration-150 ease-out hover:-translate-y-px hover:border-primary hover:text-primary motion-reduce:transition-none"
          >
            <Link href={`/espacios/${propiedad.id}`} onClick={(evento) => evento.stopPropagation()}>
              Ver detalles
            </Link>
          </Button>
        </div>

        {errorContacto ? (
          <Alert variant="destructive">
            <AlertDescription>{errorContacto}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </article>
  );
}
