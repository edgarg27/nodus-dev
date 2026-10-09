"use client";

import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { useIdioma } from "@/components/i18n/idioma-provider";
import {
  MAXIMO_NOTA,
  MAXIMO_RECORDATORIO,
  type PasoSolicitud,
  pasoTerminado,
  siguientePaso,
} from "@/lib/clientes";

interface SeguimientoSolicitudProps {
  solicitudId: string;
  paso: PasoSolicitud;
  recordatorio: { texto: string; en: Date } | null;
}

// Valor de un <input type="datetime-local"> (hora local del navegador) para una fecha.
function aLocal(fecha: Date): string {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

// Seguimiento de una solicitud con lo mínimo: un botón para pasar al siguiente paso, "Descartar", y
// una sola caja para anotar qué pasó y, si se quiere, un recordatorio con fecha
// (PATCH /api/v1/admin/solicitudes/:id).
export function SeguimientoSolicitud({
  solicitudId,
  paso,
  recordatorio,
}: SeguimientoSolicitudProps) {
  const { t } = useIdioma();
  const textos = t.admin.clientes;
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [comentario, setComentario] = useState("");
  const [recordarme, setRecordarme] = useState(recordatorio !== null);
  const [fecha, setFecha] = useState(recordatorio ? aLocal(recordatorio.en) : "");
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const ids = { comentario: useId(), recordarme: useId(), fecha: useId() };
  const siguiente = siguientePaso(paso);
  const terminado = pasoTerminado(paso);
  // Guardar sin escribir nada solo tiene sentido si cambió el recordatorio.
  const cambiaRecordatorio =
    recordarme !== (recordatorio !== null) ||
    (recordarme && fecha !== (recordatorio ? aLocal(recordatorio.en) : ""));

  async function enviar(cuerpo: Record<string, unknown>, aviso: string) {
    setGuardando(true);
    try {
      const respuesta = await fetch(`/api/v1/admin/solicitudes/${solicitudId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      setComentario("");
      setConfirmarDescarte(false);
      showToast(aviso);
      router.refresh();
    } catch {
      showToast(textos.errorGuardar);
    } finally {
      setGuardando(false);
    }
  }

  function guardarNota(evento: React.FormEvent) {
    evento.preventDefault();
    const texto = comentario.trim();
    const conRecordatorio = recordarme && fecha;
    void enviar(
      {
        ...(texto ? { comentario: texto } : {}),
        recordatorio: conRecordatorio
          ? {
              texto: (texto || recordatorio?.texto || textos.recordatorioPorDefecto).slice(
                0,
                MAXIMO_RECORDATORIO,
              ),
              en: new Date(fecha).toISOString(),
            }
          : null,
      },
      textos.solicitudActualizada,
    );
  }

  const boton =
    "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold disabled:opacity-60";

  if (terminado) {
    return (
      <button
        type="button"
        disabled={guardando}
        onClick={() => void enviar({ paso: "con_broker" }, textos.solicitudActualizada)}
        className="w-fit cursor-pointer text-sm font-semibold text-text-muted underline-offset-4 hover:text-primary hover:underline"
      >
        {textos.reabrir}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {siguiente ? (
          <button
            type="button"
            disabled={guardando}
            onClick={() => void enviar({ paso: siguiente }, textos.solicitudActualizada)}
            className={`${boton} bg-accent text-accent-foreground shadow-sm hover:bg-accent/90`}
          >
            {textos.pasarA(textos.pasos[siguiente])}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        {confirmarDescarte ? (
          <span className="flex items-center gap-3 text-sm">
            <span className="text-text-muted">{textos.confirmarDescartar}</span>
            <button
              type="button"
              disabled={guardando}
              onClick={() => void enviar({ paso: "descartada" }, textos.solicitudActualizada)}
              className="cursor-pointer font-bold text-destructive hover:underline"
            >
              {textos.siDescartar}
            </button>
            <button
              type="button"
              onClick={() => setConfirmarDescarte(false)}
              className="cursor-pointer font-semibold text-text hover:underline"
            >
              {textos.cancelar}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmarDescarte(true)}
            className="cursor-pointer text-sm font-semibold text-text-muted underline-offset-4 hover:text-destructive hover:underline"
          >
            {textos.descartar}
          </button>
        )}
      </div>

      <form onSubmit={guardarNota} className="flex flex-col gap-2.5 rounded-xl bg-background p-4">
        <label htmlFor={ids.comentario} className="text-xs font-semibold text-text-muted">
          {textos.quePaso}
        </label>
        <textarea
          id={ids.comentario}
          value={comentario}
          onChange={(evento) => setComentario(evento.target.value.slice(0, MAXIMO_NOTA))}
          rows={2}
          placeholder={textos.quePasoPlaceholder}
          className="resize-y rounded-lg border border-input bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted-foreground"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <label htmlFor={ids.recordarme} className="flex items-center gap-2 text-sm text-text">
              <input
                id={ids.recordarme}
                type="checkbox"
                checked={recordarme}
                onChange={(evento) => setRecordarme(evento.target.checked)}
                className="accent-primary"
              />
              {textos.recordarme}
            </label>
            {recordarme ? (
              <>
                <label htmlFor={ids.fecha} className="sr-only">
                  {textos.fecha}
                </label>
                <input
                  id={ids.fecha}
                  type="datetime-local"
                  required
                  value={fecha}
                  onChange={(evento) => setFecha(evento.target.value)}
                  className="h-9 rounded-lg border border-input bg-surface px-2.5 text-sm text-text"
                />
              </>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={guardando || (!comentario.trim() && !cambiaRecordatorio)}
            className={`${boton} border border-input bg-surface text-text hover:border-primary`}
          >
            {guardando ? textos.guardando : textos.guardar}
          </button>
        </div>
      </form>
    </div>
  );
}
