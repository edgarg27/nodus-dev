import { ShieldCheckIcon } from "lucide-react";
import { AgencyAvatar } from "./agency-avatar";

interface AgencyBylineProps {
  nombre: string;
  logoUrl?: string | null;
  esBroker: boolean;
  // Textos ya traducidos: este componente se usa en la parte pública, que es bilingüe.
  etiquetaPublicadoPor: string;
  etiquetaBroker: string;
}

// "Publicado por [iniciales] Nombre de la agencia · Broker verificado" (ficha pública).
export function AgencyByline({
  nombre,
  logoUrl = null,
  esBroker,
  etiquetaPublicadoPor,
  etiquetaBroker,
}: AgencyBylineProps) {
  if (!nombre) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 pt-1 text-sm text-text-muted">
      <AgencyAvatar nombre={nombre} logoUrl={logoUrl} className="size-7 rounded-full text-[11px]" />
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
