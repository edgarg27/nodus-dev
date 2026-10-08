import { Building2Icon, CalendarIcon, ShieldCheckIcon } from "lucide-react";
import { AgencyAvatar } from "./agency-avatar";

interface AgencyAdvertiserProps {
  nombre: string;
  logoUrl: string | null;
  descripcion: string;
  esBroker: boolean;
  // Textos ya traducidos y formateados: la ficha pública es bilingüe.
  textos: {
    titulo: string;
    broker: string;
    // "Dueño directo" o "Inmobiliaria"; null si no lo indicó.
    tipoAnunciante: string | null;
    espaciosPublicados: string;
    miembroDesde: string | null;
  };
}

// "Información del anunciante" en la ficha pública: logo, nombre, insignia de broker, descripción
// de la agencia, cuántos espacios tiene publicados y desde cuándo está en Captive.
export function AgencyAdvertiser({
  nombre,
  logoUrl,
  descripcion,
  esBroker,
  textos,
}: AgencyAdvertiserProps) {
  if (!nombre) return null;
  return (
    <section aria-labelledby="anunciante-titulo" className="flex flex-col gap-4">
      <h2 id="anunciante-titulo" className="text-lg font-bold text-text">
        {textos.titulo}
      </h2>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <AgencyAvatar nombre={nombre} logoUrl={logoUrl} className="size-20 text-2xl" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-lg font-bold text-text">{nombre}</span>
            {textos.tipoAnunciante ? (
              <span className="text-[13px] font-semibold text-text-muted">
                {textos.tipoAnunciante}
              </span>
            ) : null}
            {esBroker ? (
              <span className="flex w-fit items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">
                <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
                {textos.broker}
              </span>
            ) : null}
          </div>
        </div>
        {descripcion ? (
          <p className="text-sm leading-relaxed whitespace-pre-line text-text">{descripcion}</p>
        ) : null}
        <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-[13px] text-text-muted">
          <li className="flex items-center gap-1.5">
            <Building2Icon className="size-4" aria-hidden="true" />
            {textos.espaciosPublicados}
          </li>
          {textos.miembroDesde ? (
            <li className="flex items-center gap-1.5">
              <CalendarIcon className="size-4" aria-hidden="true" />
              {textos.miembroDesde}
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
