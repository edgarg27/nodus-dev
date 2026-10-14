"use client";

import { CheckIcon, FileTextIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { localeDe } from "@/lib/i18n";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";
import { FORMATOS_DOCUMENTO, type TipoDocumento } from "@/lib/verificacion";

interface DocumentUploadProps {
  tipo: TipoDocumento;
  // El documento ya subido de este tipo, si lo hay.
  documento: { id: string; nombreArchivo: string; createdAt: Date } | null;
  // Cuenta ya verificada: se puede ver el documento, pero no cambiarlo.
  soloLectura: boolean;
}

const ACEPTA = Object.keys(FORMATOS_DOCUMENTO).join(",");

// Un documento de verificación: qué se pide, si ya está subido y el botón para subirlo o cambiarlo.
export function DocumentUpload({ tipo, documento, soloLectura }: DocumentUploadProps) {
  const { idioma, t: textos } = useIdioma();
  const t = textos.verificacion;
  const router = useRouter();
  const idInput = useId();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formatoFecha = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  async function subir(archivo: File) {
    setError(null);
    setSubiendo(true);
    const cuerpo = new FormData();
    cuerpo.set("tipo", tipo);
    cuerpo.set("archivo", archivo);
    const respuesta = await fetch("/api/v1/verificacion/documentos", {
      method: "POST",
      body: cuerpo,
    }).catch(() => null);
    setSubiendo(false);

    if (!respuesta?.ok) {
      const detalle = await respuesta?.json().catch(() => null);
      setError(mensajeDeErrorApi(detalle, idioma, t.errorSubida));
      return;
    }
    router.refresh();
  }

  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-5 aria-busy:opacity-70"
      aria-busy={subiendo}
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          documento ? "bg-success/15 text-success" : "bg-background text-muted-foreground"
        }`}
      >
        {documento ? (
          <CheckIcon className="size-5" strokeWidth={2} aria-hidden="true" />
        ) : (
          <FileTextIcon className="size-5" strokeWidth={1.8} aria-hidden="true" />
        )}
      </span>

      <div className="flex min-w-[220px] grow flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-foreground">{t.documentos[tipo].titulo}</h3>
        <p className="text-[13px] text-muted-foreground">{t.documentos[tipo].ayuda}</p>
        <p className="text-xs text-muted-foreground">
          {documento ? (
            <>
              {documento.nombreArchivo} · {t.subido(formatoFecha.format(documento.createdAt))}
            </>
          ) : (
            t.sinSubir
          )}
        </p>
        {error ? (
          <p aria-live="polite" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {documento ? (
          <a
            href={`/api/v1/verificacion/documentos/${documento.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center rounded-lg px-3 text-[13px] font-bold text-foreground underline-offset-4 hover:underline"
          >
            {t.ver}
          </a>
        ) : null}
        {soloLectura ? null : (
          <>
            <label
              htmlFor={idInput}
              className={`flex h-10 cursor-pointer items-center whitespace-nowrap rounded-lg px-[18px] text-[13px] font-bold transition-all duration-150 ease-out hover:-translate-y-px motion-reduce:transition-none ${
                documento
                  ? "border border-input text-foreground hover:border-ink"
                  : "bg-accent text-accent-foreground hover:bg-accent/90"
              }`}
            >
              {subiendo ? t.subiendo : documento ? t.reemplazar : t.subir}
            </label>
            <input
              id={idInput}
              type="file"
              accept={ACEPTA}
              disabled={subiendo}
              className="sr-only"
              aria-label={`${documento ? t.reemplazar : t.subir}: ${t.documentos[tipo].titulo}`}
              onChange={(evento) => {
                const archivo = evento.target.files?.[0];
                evento.target.value = "";
                if (archivo) void subir(archivo);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
