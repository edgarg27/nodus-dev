import type { PasoSolicitud } from "@/lib/clientes";

const COLORES: Record<PasoSolicitud, string> = {
  nueva: "bg-warning-foreground text-warning",
  con_broker: "bg-accent/10 text-accent",
  con_cliente: "bg-accent/10 text-accent",
  cerrada: "bg-success/15 text-success",
  descartada: "bg-background text-text-muted",
};

interface PasoBadgeProps {
  paso: PasoSolicitud;
  etiqueta: string;
}

// Paso del seguimiento de Captive a una solicitud.
export function PasoBadge({ paso, etiqueta }: PasoBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${COLORES[paso]}`}
    >
      {etiqueta}
    </span>
  );
}
