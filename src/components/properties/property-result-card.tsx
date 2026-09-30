"use client";

import { Building2Icon, StoreIcon, WarehouseIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PropertyDetailsDialog } from "./property-details-dialog";

export interface PropertyResultData {
  id: string;
  direccion: string;
  tipo: string;
  modalidad: string;
  estado: string;
  ciudad: string;
  descripcion: string;
}

interface PropertyResultCardProps {
  propiedad: PropertyResultData;
  numero: number;
  selected: boolean;
  onSelect: () => void;
}

const ICONO_POR_TIPO = {
  nave_industrial: WarehouseIcon,
  oficina: Building2Icon,
  local_comercial: StoreIcon,
} as const;

const ETIQUETA_MODALIDAD: Record<string, string> = {
  renta: "Renta",
  venta: "Venta",
  desde_cero: "Proyecto desde cero",
};

const ETIQUETA_TIPO: Record<string, string> = {
  nave_industrial: "Nave industrial",
  oficina: "Oficina",
  local_comercial: "Local comercial",
};

interface ContactoRevelado {
  telefono: string | null;
  whatsappUrl: string | null;
}

export function PropertyResultCard({
  propiedad,
  numero,
  selected,
  onSelect,
}: PropertyResultCardProps) {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [contacto, setContacto] = useState<ContactoRevelado | null>(null);
  const [errorContacto, setErrorContacto] = useState<string | null>(null);

  const Icono = ICONO_POR_TIPO[propiedad.tipo as keyof typeof ICONO_POR_TIPO] ?? WarehouseIcon;

  async function contactar() {
    setErrorContacto(null);

    const respuesta = await fetch("/api/v1/contact-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propiedad_id: propiedad.id }),
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
    // biome-ignore lint/a11y/useKeyWithClickEvents: onClick aquí es solo conveniencia de mouse (resalta la tarjeta y su pin en el mapa); Contactar y Ver detalles, los controles realmente accionables, ya son botones con su propio foco y activación por teclado.
    <article
      id={`listing-${propiedad.id}`}
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex cursor-pointer scroll-mt-32 flex-col overflow-hidden rounded-2xl border-2 bg-surface transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none ${
        selected ? "border-accent shadow-[0_0_0_3px_rgba(255,122,69,0.22)]" : "border-border"
      }`}
    >
      <div className="relative flex h-[150px] shrink-0 items-center justify-center bg-gradient-to-br from-primary/70 to-primary">
        <Icono
          className="size-12 text-primary-foreground/50"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
          {ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad}
        </span>
        <span className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">
          {numero}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-[18px]">
        <span className="text-[11px] font-semibold tracking-wide text-warning uppercase">
          {ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo}
        </span>
        <h3 className="text-base font-semibold text-text">{propiedad.direccion}</h3>
        <p className="text-[13px] text-text-muted">
          {propiedad.ciudad}, {propiedad.estado}
        </p>

        {contacto ? (
          <p className="pt-1 text-sm text-text">
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
        ) : (
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              className="h-9 flex-1 gap-0 rounded-lg bg-accent px-3 text-[13px] font-bold text-accent-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md motion-reduce:transition-none"
              onClick={(evento) => {
                evento.stopPropagation();
                void contactar();
              }}
            >
              Contactar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 gap-0 rounded-lg border-input px-3 text-[13px] font-bold text-text transition-transform duration-150 ease-out hover:-translate-y-px hover:border-primary hover:text-primary motion-reduce:transition-none"
              onClick={(evento) => {
                evento.stopPropagation();
                setDetailsOpen(true);
              }}
            >
              Ver detalles
            </Button>
          </div>
        )}

        {errorContacto ? (
          <Alert variant="destructive">
            <AlertDescription>{errorContacto}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <PropertyDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        propiedad={propiedad}
        onContact={contactar}
      />
    </article>
  );
}
