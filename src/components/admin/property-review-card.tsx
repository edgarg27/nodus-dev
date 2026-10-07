"use client";

import { Building2Icon, StoreIcon, WarehouseIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { PropertyDetailsDialog } from "@/components/admin/property-details-dialog";
import { RejectPropertyDialog } from "@/components/admin/reject-property-dialog";
import { useIdioma } from "@/components/i18n/idioma-provider";
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

export function PropertyReviewCard({ propiedad }: PropertyReviewCardProps) {
  const { t } = useIdioma();
  const p = t.admin.propiedades;
  const etiquetas = t.etiquetas as {
    tipo: Record<string, string>;
    modalidad: Record<string, string>;
  };
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
      showToast(p.yaRevisada);
    } else if (respuesta.ok) {
      showToast(decision.decision === "aprobar" ? p.aprobada : p.rechazada);
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
              alt={`${propiedad.direccion} — ${etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo}`}
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
            {etiquetas.modalidad[propiedad.modalidad] ?? propiedad.modalidad}
          </span>
        </div>
        <p className="text-sm text-text-muted">
          {propiedad.ciudad}, {propiedad.estado}
        </p>
        {propiedad.oferente ? (
          <p className="text-xs text-text-muted">{p.publicadaPor(propiedad.oferente.nombre)}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 max-md:w-full max-md:flex-wrap">
        <Button
          type="button"
          variant="outline"
          disabled={enviando}
          onClick={() => setDetailsOpen(true)}
        >
          {p.verDetalles}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={enviando}
          onClick={() => setRejectOpen(true)}
        >
          {p.rechazar}
        </Button>
        <Button
          type="button"
          disabled={enviando}
          onClick={() => enviarDecision({ decision: "aprobar" })}
        >
          {p.aprobar}
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
