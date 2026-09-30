"use client";

import { Building2Icon, StoreIcon, WarehouseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { PropertyResultData } from "./property-result-card";

interface PropertyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propiedad: PropertyResultData;
  onContact: () => void | Promise<void>;
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

export function PropertyDetailsDialog({
  open,
  onOpenChange,
  propiedad,
  onContact,
}: PropertyDetailsDialogProps) {
  const Icono = ICONO_POR_TIPO[propiedad.tipo as keyof typeof ICONO_POR_TIPO] ?? WarehouseIcon;

  async function alContactar() {
    await onContact();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-xl gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div className="flex h-[200px] shrink-0 items-center justify-center rounded-t-xl bg-gradient-to-br from-primary/70 to-primary">
          <Icono
            className="size-16 text-primary-foreground/50"
            strokeWidth={1.4}
            aria-hidden="true"
          />
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle asChild>
                <h2 className="text-lg font-bold text-text">{propiedad.direccion}</h2>
              </DialogTitle>
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                {ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad}
              </span>
            </div>
            <p className="text-sm text-text-muted">
              {propiedad.ciudad}, {propiedad.estado}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl bg-background p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
                Modalidad
              </span>
              <span className="text-sm font-semibold text-text">
                {ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
                Tipo
              </span>
              <span className="text-sm font-semibold text-text">
                {ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-text">Descripción</span>
            <p className="text-sm leading-relaxed text-text">{propiedad.descripcion}</p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-accent text-accent-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 hover:shadow-md motion-reduce:transition-none"
              onClick={alContactar}
            >
              Contactar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
