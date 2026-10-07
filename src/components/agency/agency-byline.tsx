import { ShieldCheckIcon } from "lucide-react";
import { iniciales } from "@/lib/initials";

interface AgencyBylineProps {
  nombre: string;
  esBroker: boolean;
  // Textos ya traducidos: este componente se usa en la parte pública, que es bilingüe.
  etiquetaPublicadoPor: string;
  etiquetaBroker: string;
}

// "Publicado por [iniciales] Nombre de la agencia · Broker verificado" (ficha pública).
export function AgencyByline({
  nombre,
  esBroker,
  etiquetaPublicadoPor,
  etiquetaBroker,
}: AgencyBylineProps) {
  if (!nombre) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 pt-1 text-sm text-text-muted">
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
      >
        {iniciales(nombre) || "?"}
      </span>
      <span>
        {etiquetaPublicadoPor} <strong className="font-semibold text-text">{nombre}</strong>
      </span>
      {esBroker ? (
        <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
          <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
          {etiquetaBroker}
        </span>
      ) : null}
    </p>
  );
}
