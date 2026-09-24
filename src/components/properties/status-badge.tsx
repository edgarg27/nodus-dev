import { Badge } from "@/components/ui/badge";

export type EstadoPublicacion = "pendiente" | "publicada" | "rechazada";

const TEXTOS: Record<EstadoPublicacion, string> = {
  pendiente: "En revisión",
  publicada: "Publicada",
  rechazada: "Rechazada",
};

const VARIANTES: Record<
  EstadoPublicacion,
  { variant: "secondary" | "destructive"; className?: string }
> = {
  pendiente: { variant: "secondary" },
  publicada: { variant: "secondary", className: "bg-success/10 text-success" },
  rechazada: { variant: "destructive" },
};

interface StatusBadgeProps {
  estado: EstadoPublicacion;
}

export function StatusBadge({ estado }: StatusBadgeProps) {
  const { variant, className } = VARIANTES[estado];
  return (
    <Badge role="status" variant={variant} className={className}>
      {TEXTOS[estado]}
    </Badge>
  );
}
