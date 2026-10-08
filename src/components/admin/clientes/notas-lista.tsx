import { NotebookPenIcon, PhoneCallIcon } from "lucide-react";
import type { Textos } from "@/lib/i18n";
import type { NotaDeSeguimiento } from "@/server/clientes/queries";

interface NotasListaProps {
  notas: NotaDeSeguimiento[];
  // Nombre corto de cada solicitud, para decir de cuál trata la nota.
  etiquetaSolicitud: Map<string, string>;
  textos: Textos["admin"]["clientes"];
  formatoFechaHora: Intl.DateTimeFormat;
}

// Bitácora del seguimiento, de la más reciente a la más antigua.
export function NotasLista({
  notas,
  etiquetaSolicitud,
  textos,
  formatoFechaHora,
}: NotasListaProps) {
  if (notas.length === 0) {
    return <p className="text-sm text-text-muted">{textos.sinNotas}</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {notas.map((nota) => {
        const Icono = nota.tipo === "nota" ? NotebookPenIcon : PhoneCallIcon;
        const sobre = nota.contactRequestId ? etiquetaSolicitud.get(nota.contactRequestId) : null;
        return (
          <li key={nota.id} className="flex gap-3 rounded-xl bg-background p-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Icono className="size-4" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-semibold text-text">
                {textos.tiposNota[nota.tipo]}
                {sobre ? <span className="font-normal text-text-muted"> · {sobre}</span> : null}
              </span>
              <p className="text-sm whitespace-pre-line text-text">{nota.texto}</p>
              <span className="text-xs text-text-muted">
                {nota.autor} · {formatoFechaHora.format(nota.creadaEn)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
