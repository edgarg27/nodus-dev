import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DocumentUpload } from "@/components/verificacion/document-upload";
import { ResubmitButton } from "@/components/verificacion/resubmit-button";
import { documentosRequeridos } from "@/lib/verificacion";
import { requireRol } from "@/server/auth/guards";
import { getUsuarioActual } from "@/server/auth/session";
import { obtenerTextos } from "@/server/i18n";
import { obtenerVerificacion } from "@/server/verificacion/estado";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await obtenerTextos();
  return { title: t.verificacion.metaTitulo };
}

// Donde el broker o dueño sube los documentos con los que Captive confirma que es real, y donde ve
// en qué va su revisión.
export default async function VerificacionPage() {
  const actor = await getUsuarioActual();
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) notFound();

  const t = (await obtenerTextos()).t.verificacion;
  const verificacion = await obtenerVerificacion(actor.id);
  // Cuentas que nunca pasaron por aprobación no tienen nada que verificar.
  if (verificacion.estado === "sin_solicitud") notFound();

  const faltan = verificacion.faltantes.length > 0;
  let etiqueta = t.estado.revision;
  let texto = t.textoRevision;
  if (verificacion.estado === "verificado") {
    etiqueta = t.estado.verificado;
    texto = t.textoVerificado;
  } else if (verificacion.estado === "denegada") {
    etiqueta = t.estado.denegada;
    texto = t.textoDenegada;
  } else if (faltan) {
    etiqueta = t.estado.faltan;
    texto = t.textoFaltan;
  }
  const verificado = verificacion.estado === "verificado";
  // Ya verificada, solo se listan los documentos que sí subió (pudo aprobarse sin alguno).
  const tipos = documentosRequeridos(verificacion.tipo).filter(
    (tipo) => !verificado || verificacion.documentos.some((documento) => documento.tipo === tipo),
  );

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-3">
        <Badge
          variant="secondary"
          className={
            verificado
              ? "w-fit bg-success/15 text-success"
              : verificacion.estado === "denegada"
                ? "w-fit bg-destructive/10 text-destructive"
                : "w-fit bg-warning-foreground text-warning"
          }
        >
          {etiqueta}
        </Badge>
        <h1 className="font-display text-[28px] font-bold text-foreground">{t.titulo}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.intro}</p>
        <p className="text-sm font-medium text-foreground">{texto}</p>
        {verificacion.estado === "denegada" ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground">
            <strong className="font-semibold">{t.motivo}</strong>{" "}
            {verificacion.motivoDenegacion ?? t.sinMotivo}
          </p>
        ) : null}
      </header>

      {tipos.length > 0 ? (
        <section className="flex flex-col gap-3">
          {tipos.map((tipo) => (
            <DocumentUpload
              key={tipo}
              tipo={tipo}
              soloLectura={verificado}
              documento={
                verificacion.documentos.find((documento) => documento.tipo === tipo) ?? null
              }
            />
          ))}
          <p className="text-xs text-muted-foreground">
            {verificado ? t.privacidad : `${t.formatos} ${t.privacidad}`}
          </p>
        </section>
      ) : null}

      {verificacion.estado === "denegada" ? <ResubmitButton disabled={faltan} /> : null}

      <Link
        href="/panel"
        className="w-fit text-sm font-semibold text-foreground underline-offset-4 hover:underline"
      >
        {t.volverPanel}
      </Link>
    </main>
  );
}
