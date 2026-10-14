import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import type { Textos } from "@/lib/i18n";
import type { ParecidaParaAdmin } from "@/server/properties/near-duplicates";

interface PossibleDuplicatesNoticeProps {
  parecidas: ParecidaParaAdmin[];
  textos: Textos["admin"]["propiedades"];
}

// "Posible duplicado" en la tarjeta de revisión: ya hay espacios vigentes del mismo tipo a pocos
// metros. No bloquea la aprobación: el admin compara y decide.
export function PossibleDuplicatesNotice({ parecidas, textos }: PossibleDuplicatesNoticeProps) {
  if (parecidas.length === 0) return null;
  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-xl border border-warning/40 bg-warning-foreground p-3">
      <span className="flex items-center gap-1.5 text-xs font-bold text-warning">
        <CopyIcon className="size-3.5" aria-hidden="true" />
        {textos.posibleDuplicado}
      </span>
      <ul className="flex flex-col gap-1">
        {parecidas.map((parecida) => (
          <li key={parecida.id} className="flex flex-wrap items-center gap-x-2 text-xs text-text">
            <span className="font-semibold">{parecida.titulo ?? parecida.direccion}</span>
            <span className="text-text-muted">
              {textos.parecidaDetalle(parecida.distanciaM, parecida.propietario)} ·{" "}
              {parecida.estadoPublicacion === "publicada"
                ? textos.parecidaPublicada
                : textos.parecidaPendiente}
            </span>
            {parecida.estadoPublicacion === "publicada" ? (
              <a
                href={`/espacios/${parecida.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
              >
                {textos.verDetalles}
                <ExternalLinkIcon className="size-3" aria-hidden="true" />
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
