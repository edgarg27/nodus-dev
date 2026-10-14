"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { OwnerNumber } from "@/components/admin/owner-number";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localeDe } from "@/lib/i18n";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";
import { iniciales } from "@/lib/initials";
import { documentosFaltantes } from "@/lib/verificacion";
import { RequestDocuments } from "./request-documents";

interface Solicitud {
  id: string;
  mensaje: string;
  // "broker" o "dueno".
  tipo: string;
  createdAt: Date;
  usuario: {
    nombre: string;
    email: string;
    telefono: string | null;
    numeroPropietario: number | null;
  };
  // Estados donde ya tiene propiedades.
  estados: string[];
  // Documentos de verificación que la persona ya subió.
  documentos: { id: string; tipo: string }[];
}

interface RequestActionsProps {
  solicitud: Solicitud;
}

const TEXTO_MAXIMO = 500;

export function RequestActions({ solicitud }: RequestActionsProps) {
  const { idioma, t } = useIdioma();
  const s = t.admin.solicitudes;
  const formatoFecha = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [enviando, setEnviando] = useState(false);
  // Paso extra antes de resolver: la nota para aprobar sin documentos o el motivo de la denegación.
  const [paso, setPaso] = useState<"aprobar" | "denegar" | null>(null);
  const [texto, setTexto] = useState("");
  const faltanDocumentos = documentosFaltantes(solicitud.tipo, solicitud.documentos).length > 0;

  async function resolver(accion: "approve" | "deny", cuerpo: Record<string, string>) {
    setEnviando(true);
    const respuesta = await fetch(`/api/v1/admin/broker-requests/${solicitud.id}/${accion}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    setEnviando(false);

    if (respuesta.status === 409) {
      showToast(s.yaResuelta);
      router.refresh();
      return;
    }
    const datos = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      showToast(mensajeDeErrorApi(datos, idioma, s.errorResolver));
      return;
    }
    if (accion === "deny") showToast(s.denegada);
    // Un dueño se verifica; un broker recibe su código.
    else showToast(datos.data.broker_code ? s.aprobada(datos.data.broker_code) : s.aprobadaDueno);
    router.refresh();
  }

  function abrirPaso(nuevo: "aprobar" | "denegar") {
    setTexto("");
    setPaso(nuevo);
  }

  function confirmarPaso() {
    const recortado = texto.trim();
    if (paso === "aprobar") void resolver("approve", { nota: recortado });
    else void resolver("deny", recortado ? { motivo: recortado } : {});
  }

  return (
    <article
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 aria-busy:opacity-70"
      aria-busy={enviando}
    >
      <div className="flex items-center gap-5 max-md:flex-col max-md:items-start">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background font-display text-sm font-bold text-text">
          {iniciales(solicitud.usuario.nombre)}
        </span>

        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text">{solicitud.usuario.nombre}</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                solicitud.tipo === "dueno"
                  ? "bg-success/15 text-success"
                  : "bg-accent/10 text-accent"
              }`}
            >
              {solicitud.tipo === "dueno" ? s.tipoDueno : s.tipoBroker}
            </span>
            {faltanDocumentos ? (
              <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning">
                {s.faltanDocumentos}
              </span>
            ) : null}
          </div>
          <OwnerNumber
            numero={solicitud.usuario.numeroPropietario}
            estados={solicitud.estados}
            etiqueta={t.admin.numeroPropietario}
          />
          <p className="text-sm text-text-muted">
            {solicitud.usuario.email}
            {solicitud.usuario.telefono ? ` · ${solicitud.usuario.telefono}` : ""}
          </p>
          <p className="text-sm text-text italic">“{solicitud.mensaje}”</p>
          <p className="text-xs text-text-muted">
            {s.solicitado(formatoFecha.format(solicitud.createdAt))}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 max-md:w-full max-md:flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={enviando}
            onClick={() => abrirPaso("denegar")}
          >
            {s.denegar}
          </Button>
          <Button
            type="button"
            disabled={enviando}
            onClick={() => (faltanDocumentos ? abrirPaso("aprobar") : void resolver("approve", {}))}
          >
            {s.aprobar}
          </Button>
        </div>
      </div>

      <RequestDocuments tipoSolicitud={solicitud.tipo} documentos={solicitud.documentos} t={t} />

      {paso ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4">
          <label htmlFor={`texto-${solicitud.id}`} className="text-sm font-semibold text-text">
            {paso === "aprobar" ? s.notaTitulo : s.motivoTitulo}
          </label>
          <Textarea
            id={`texto-${solicitud.id}`}
            value={texto}
            maxLength={TEXTO_MAXIMO}
            placeholder={paso === "aprobar" ? s.notaPlaceholder : s.motivoPlaceholder}
            onChange={(evento) => setTexto(evento.target.value)}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={enviando}
              onClick={() => setPaso(null)}
            >
              {s.cancelar}
            </Button>
            <Button
              type="button"
              disabled={enviando || (paso === "aprobar" && texto.trim().length === 0)}
              onClick={confirmarPaso}
            >
              {paso === "aprobar" ? s.confirmarAprobar : s.confirmarDenegar}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
