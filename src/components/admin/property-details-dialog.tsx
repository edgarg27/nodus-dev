"use client";

import { Building2Icon, StoreIcon, WarehouseIcon, XIcon } from "lucide-react";
import { useIdioma } from "@/components/i18n/idioma-provider";
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

export function PropertyDetailsDialog({
  open,
  onOpenChange,
  propiedad,
  disabled,
  onApprove,
  onReject,
}: PropertyDetailsDialogProps) {
  const { t } = useIdioma();
  const p = t.admin.propiedades;
  const etiquetas = t.etiquetas as {
    tipo: Record<string, string>;
    modalidad: Record<string, string>;
  };
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
              <span className="sr-only">{p.cerrar}</span>
            </Button>
          </DialogClose>
          {primeraFoto ? (
            // biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático
            <img
              src={primeraFoto.storageUrl}
              alt={`${propiedad.direccion} — ${etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo}`}
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
              {p.fotos(propiedad.fotos.length)}
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
                {p.modalidad}
              </span>
              <span className="text-sm font-semibold text-text">
                {etiquetas.modalidad[propiedad.modalidad] ?? propiedad.modalidad}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
                {p.tipo}
              </span>
              <span className="text-sm font-semibold text-text">
                {etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-text">{p.descripcionCampo}</span>
            <p className="text-sm leading-relaxed text-text">{propiedad.descripcion}</p>
          </div>

          {propiedad.oferente ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="text-sm font-bold text-text">{p.datosOferente}</span>
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
              {p.rechazar}
            </Button>
            <Button type="button" disabled={disabled} onClick={onApprove}>
              {p.aprobar}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
