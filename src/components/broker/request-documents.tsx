import { CheckIcon, FileWarningIcon } from "lucide-react";
import type { Textos } from "@/lib/i18n";
import { documentosRequeridos } from "@/lib/verificacion";

interface RequestDocumentsProps {
  // "broker" o "dueno": decide qué documentos se esperan.
  tipoSolicitud: string;
  documentos: { id: string; tipo: string }[];
  t: Textos;
}

// Documentos de verificación de una solicitud: cada uno abre en otra pestaña (enlace que caduca en un
// minuto) o aparece como "sin subir".
export function RequestDocuments({ tipoSolicitud, documentos, t }: RequestDocumentsProps) {
  const s = t.admin.solicitudes;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
        {s.documentos}
      </span>
      <ul className="flex flex-wrap gap-2">
        {documentosRequeridos(tipoSolicitud).map((tipo) => {
          const documento = documentos.find((candidato) => candidato.tipo === tipo);
          const titulo = t.verificacion.documentos[tipo].titulo;
          return (
            <li key={tipo}>
              {documento ? (
                <a
                  href={`/api/v1/verificacion/documentos/${documento.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-text transition-colors hover:border-ink"
                >
                  <CheckIcon className="size-4 text-success" strokeWidth={2} aria-hidden="true" />
                  {titulo}
                </a>
              ) : (
                <span className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-[13px] text-text-muted">
                  <FileWarningIcon className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  {titulo} · {s.sinSubir}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
