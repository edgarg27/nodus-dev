import type { EstadoCliente } from "@/lib/clientes";

const COLORES: Record<EstadoCliente, string> = {
  pendiente: "bg-warning-foreground text-warning",
  seguimiento: "bg-accent/10 text-accent",
  cerrado: "bg-success/15 text-success",
};

interface EstadoBadgeProps {
  estado: EstadoCliente;
  etiqueta: string;
}

// Etapa del seguimiento de Captive a un cliente.
export function EstadoBadge({ estado, etiqueta }: EstadoBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${COLORES[estado]}`}
    >
      {etiqueta}
    </span>
  );
}
