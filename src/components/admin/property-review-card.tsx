"use client";

import { Building2Icon, StoreIcon, WarehouseIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { PropertyDetailsDialog } from "@/components/admin/property-details-dialog";
import { RejectPropertyDialog } from "@/components/admin/reject-property-dialog";
import { Button } from "@/components/ui/button";
import type { PropiedadPendienteDeRevision } from "@/server/properties/queries";

interface PropertyReviewCardProps {
  propiedad: PropiedadPendienteDeRevision;
}

type Decision = { decision: "aprobar" } | { decision: "rechazar"; motivo: string };

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

export function PropertyReviewCard({ propiedad }: PropertyReviewCardProps) {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const Icono = ICONO_POR_TIPO[propiedad.tipo as keyof typeof ICONO_POR_TIPO] ?? WarehouseIcon;
  const esRenta = propiedad.modalidad === "renta";

  async function enviarDecision(decision: Decision) {
    setEnviando(true);

    const respuesta = await fetch(`/api/v1/admin/properties/${propiedad.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision),
    });

    setEnviando(false);
    if (respuesta.status === 409) {
      showToast("Esta propiedad ya fue revisada.");
    } else if (respuesta.ok) {
      showToast(
        decision.decision === "aprobar"
          ? "Propiedad aprobada y ahora es pública."
          : "Propiedad rechazada. El oferente verá el motivo para corregirla.",
      );
    }
    if (respuesta.ok || respuesta.status === 409) {
      setRejectOpen(false);
      setDetailsOpen(false);
      router.refresh();
    }
  }

  return (
    <article
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-shadow duration-150 ease-out aria-busy:opacity-70 max-md:flex-col max-md:items-start"
      aria-busy={enviando}
    >
      {propiedad.fotos.length > 0 ? (
        <div className="flex shrink-0 gap-1.5">
          {propiedad.fotos.slice(0, 3).map((foto) => (
            // biome-ignore lint/performance/noImgElement: foto subida por el oferente, no un asset estático
            <img
              key={foto.id}
              src={foto.storageUrl}
              alt={`${propiedad.direccion} — ${propiedad.tipo}`}
              width={64}
              height={64}
              className="size-16 rounded-lg border border-border object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/70 to-primary">
          <Icono
            className="size-7 text-primary-foreground/60"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
      )}

      <div className="flex min-w-0 grow flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-text">{propiedad.direccion}</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              esRenta ? "bg-warning-foreground text-warning" : "bg-muted text-primary"
            }`}
          >
            {ETIQUETA_MODALIDAD[propiedad.modalidad] ?? propiedad.modalidad}
          </span>
        </div>
        <p className="text-sm text-text-muted">
          {propiedad.ciudad}, {propiedad.estado}
        </p>
        {propiedad.oferente ? (
          <p className="text-xs text-text-muted">Publicada por {propiedad.oferente.nombre}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 max-md:w-full max-md:flex-wrap">
        <Button
          type="button"
          variant="outline"
          disabled={enviando}
          onClick={() => setDetailsOpen(true)}
        >
          Ver detalles
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={enviando}
          onClick={() => setRejectOpen(true)}
        >
          Rechazar
        </Button>
        <Button
          type="button"
          disabled={enviando}
          onClick={() => enviarDecision({ decision: "aprobar" })}
        >
          Aprobar
        </Button>
      </div>

      <RejectPropertyDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={propiedad.direccion}
        disabled={enviando}
        onConfirm={(motivo) => enviarDecision({ decision: "rechazar", motivo })}
      />

      <PropertyDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        propiedad={propiedad}
        disabled={enviando}
        onApprove={() => enviarDecision({ decision: "aprobar" })}
        onReject={() => {
          setDetailsOpen(false);
          setRejectOpen(true);
        }}
      />
    </article>
  );
}
