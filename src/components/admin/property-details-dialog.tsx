"use client";

import { Building2Icon, StoreIcon, WarehouseIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { PropiedadPendienteDeRevision } from "@/server/properties/queries";

interface PropertyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propiedad: PropiedadPendienteDeRevision;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
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
  disabled,
  onApprove,
  onReject,
}: PropertyDetailsDialogProps) {
  const Icono = ICONO_POR_TIPO[propiedad.tipo as keyof typeof ICONO_POR_TIPO] ?? WarehouseIcon;
  const primeraFoto = propiedad.fotos[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[88dvh] max-w-xl gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        <div className="relative flex h-[200px] shrink-0 items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br from-primary/70 to-primary">
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 bg-white/20 text-primary-foreground hover:bg-white/30 hover:text-primary-foreground"
            >
              <XIcon />
              <span className="sr-only">Cerrar</span>
            </Button>
          </DialogClose>
          {primeraFoto ? (
            // biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático
            <img
              src={primeraFoto.storageUrl}
              alt={`${propiedad.direccion} — ${ETIQUETA_TIPO[propiedad.tipo] ?? propiedad.tipo}`}
              className="size-full object-cover"
            />
          ) : (
            <Icono
              className="size-16 text-primary-foreground/50"
              strokeWidth={1.4}
              aria-hidden="true"
            />
          )}
          {propiedad.fotos.length > 0 ? (
            <span className="absolute top-3.5 left-3.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-primary-foreground">
              1 / {propiedad.fotos.length} fotos
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <DialogTitle asChild>
              <h2 className="text-lg font-bold text-text">{propiedad.direccion}</h2>
            </DialogTitle>
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

          {propiedad.oferente ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="text-sm font-bold text-text">Datos del oferente</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-text">{propiedad.oferente.nombre}</span>
                <span className="text-sm text-text-muted">
                  {propiedad.oferente.email}
                  {propiedad.oferente.telefono ? ` · ${propiedad.oferente.telefono}` : ""}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2.5">
            <Button type="button" variant="destructive" disabled={disabled} onClick={onReject}>
              Rechazar
            </Button>
            <Button type="button" disabled={disabled} onClick={onApprove}>
              Aprobar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
