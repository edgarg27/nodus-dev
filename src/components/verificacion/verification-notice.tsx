import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { type Idioma, textosDe } from "@/lib/i18n";

interface VerificationNoticeProps {
  idioma: Idioma;
  estado: "pendiente" | "denegada";
  faltanDocumentos: boolean;
}

// Aviso para el propietario que todavía no puede publicar: le dice qué falta y lo lleva a /verificacion.
export function VerificationNotice({ idioma, estado, faltanDocumentos }: VerificationNoticeProps) {
  const t = textosDe(idioma).verificacion;
  let texto = t.avisoRevision;
  if (estado === "denegada") texto = t.avisoDenegada;
  else if (faltanDocumentos) texto = t.avisoFaltan;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-warning/40 bg-surface px-[22px] py-[18px]">
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-warning/15">
        <ShieldAlertIcon className="size-5 text-warning" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="flex min-w-[220px] grow flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{t.avisoTitulo}</span>
        <span className="text-[13px] text-muted-foreground">{texto}</span>
      </div>
      <Link
        href="/verificacion"
        className="flex h-10 items-center whitespace-nowrap rounded-lg bg-accent px-[18px] text-[13px] font-bold text-accent-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 motion-reduce:transition-none"
      >
        {t.avisoBoton}
      </Link>
    </div>
  );
}
