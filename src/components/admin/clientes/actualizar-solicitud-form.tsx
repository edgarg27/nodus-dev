"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { useIdioma } from "@/components/i18n/idioma-provider";
import {
  MAXIMO_NOTA,
  MAXIMO_PROXIMA_ACCION,
  PASOS_SOLICITUD,
  type PasoSolicitud,
  pasoTerminado,
} from "@/lib/clientes";

interface ActualizarSolicitudFormProps {
  solicitudId: string;
  paso: PasoSolicitud;
  proximaAccion: { texto: string; en: Date } | null;
}

// Valor de un <input type="datetime-local"> (hora local del navegador) para una fecha.
function aLocal(fecha: Date): string {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

// Cambia el paso, la próxima acción y deja un comentario (PATCH /api/v1/admin/solicitudes/:id).
// El cambio de paso queda en la bitácora solo.
export function ActualizarSolicitudForm({
  solicitudId,
  paso,
  proximaAccion,
}: ActualizarSolicitudFormProps) {
  const { t } = useIdioma();
  const textos = t.admin.clientes;
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [abierto, setAbierto] = useState(false);
  const [nuevoPaso, setNuevoPaso] = useState<PasoSolicitud>(paso);
  const [accion, setAccion] = useState(proximaAccion?.texto ?? "");
  const [fecha, setFecha] = useState(proximaAccion ? aLocal(proximaAccion.en) : "");
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const ids = { paso: useId(), accion: useId(), fecha: useId(), comentario: useId() };
  const terminado = pasoTerminado(nuevoPaso);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (guardando) return;
    const conAccion = !terminado && (accion.trim() || fecha);
    if (conAccion && !(accion.trim() && fecha)) {
      setError(textos.faltaFecha);
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const respuesta = await fetch(`/api/v1/admin/solicitudes/${solicitudId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paso: nuevoPaso,
          proxima_accion: conAccion
            ? { texto: accion.trim(), en: new Date(fecha).toISOString() }
            : null,
          ...(comentario.trim() ? { comentario: comentario.trim() } : {}),
        }),
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      setComentario("");
      setAbierto(false);
      showToast(textos.solicitudActualizada);
      router.refresh();
    } catch {
      showToast(textos.errorGuardar);
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="h-10 w-full cursor-pointer rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm hover:bg-accent/90 sm:w-auto sm:self-end"
      >
        {textos.actualizar}
      </button>
    );
  }

  const campo =
    "h-10 rounded-lg border border-input bg-background px-3 text-sm text-text disabled:opacity-60";
  const etiqueta = "text-xs font-semibold text-text-muted";

  return (
    <form
      onSubmit={(evento) => void guardar(evento)}
      className="flex flex-col gap-3 rounded-xl bg-background p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.paso} className={etiqueta}>
          {textos.paso}
        </label>
        <select
          id={ids.paso}
          value={nuevoPaso}
          onChange={(evento) => setNuevoPaso(evento.target.value as PasoSolicitud)}
          className={campo}
        >
          {PASOS_SOLICITUD.map((opcion) => (
            <option key={opcion} value={opcion}>
              {textos.pasos[opcion]}
            </option>
          ))}
        </select>
      </div>

      {terminado ? null : (
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.accion} className={etiqueta}>
              {textos.proximaAccion}
            </label>
            <input
              id={ids.accion}
              value={accion}
              onChange={(evento) => setAccion(evento.target.value.slice(0, MAXIMO_PROXIMA_ACCION))}
              placeholder={textos.proximaAccionPlaceholder}
              className={`${campo} placeholder:text-muted-foreground`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.fecha} className={etiqueta}>
              {textos.fecha}
            </label>
            <input
              id={ids.fecha}
              type="datetime-local"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
              className={campo}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.comentario} className={etiqueta}>
          {textos.comentario}
        </label>
        <textarea
          id={ids.comentario}
          value={comentario}
          onChange={(evento) => setComentario(evento.target.value.slice(0, MAXIMO_NOTA))}
          rows={2}
          placeholder={textos.comentarioPlaceholder}
          className="resize-y rounded-lg border border-input bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted-foreground"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="h-10 cursor-pointer rounded-lg border border-input px-4 text-sm font-semibold text-text hover:border-primary"
        >
          {textos.cancelar}
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="h-10 cursor-pointer rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:opacity-60"
        >
          {guardando ? textos.guardando : textos.guardar}
        </button>
      </div>
    </form>
  );
}
