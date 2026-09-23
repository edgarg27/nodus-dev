export type EstadoPublicacion = "pendiente" | "publicada" | "rechazada";

const TEXTOS: Record<EstadoPublicacion, string> = {
  pendiente: "En revisión",
  publicada: "Publicada",
  rechazada: "Rechazada",
};

interface StatusBadgeProps {
  estado: EstadoPublicacion;
}

export function StatusBadge({ estado }: StatusBadgeProps) {
  return <span role="status">{TEXTOS[estado]}</span>;
}
