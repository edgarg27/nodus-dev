"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useAdminToast } from "@/components/admin/admin-toast";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { MAXIMO_NOTA, TIPOS_NOTA, type TipoNota } from "@/lib/clientes";

interface NotaFormProps {
  clienteId: string;
  // Solicitudes del cliente a las que se puede ligar la nota.
  solicitudes: { id: string; etiqueta: string }[];
}

// Agrega una llamada o nota a la bitácora (POST /api/v1/admin/clientes/:id/notas).
export function NotaForm({ clienteId, solicitudes }: NotaFormProps) {
  const { t } = useIdioma();
  const textos = t.admin.clientes;
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [tipo, setTipo] = useState<TipoNota>("llamada_broker");
  const [solicitudId, setSolicitudId] = useState(solicitudes[0]?.id ?? "");
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const idTipo = useId();
  const idSobre = useId();
  const idTexto = useId();

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!texto.trim() || guardando) return;
    setGuardando(true);
    try {
      const respuesta = await fetch(`/api/v1/admin/clientes/${clienteId}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          texto: texto.trim(),
          contact_request_id: solicitudId || null,
        }),
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      setTexto("");
      showToast(textos.notaAgregada);
      router.refresh();
    } catch {
      showToast(textos.errorGuardar);
    } finally {
      setGuardando(false);
    }
  }

  const campo =
    "h-10 rounded-lg border border-input bg-background px-3 text-sm text-text disabled:opacity-60";

  return (
    <form onSubmit={(evento) => void enviar(evento)} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idTipo} className="text-xs font-semibold text-text-muted">
            {textos.tipoNota}
          </label>
          <select
            id={idTipo}
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as TipoNota)}
            className={campo}
          >
            {TIPOS_NOTA.map((opcion) => (
              <option key={opcion} value={opcion}>
                {textos.tiposNota[opcion]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idSobre} className="text-xs font-semibold text-text-muted">
            {textos.sobre}
          </label>
          <select
            id={idSobre}
            value={solicitudId}
            onChange={(evento) => setSolicitudId(evento.target.value)}
            className={campo}
          >
            {solicitudes.map((solicitud) => (
              <option key={solicitud.id} value={solicitud.id}>
                {solicitud.etiqueta}
              </option>
            ))}
            <option value="">{textos.general}</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idTexto} className="text-xs font-semibold text-text-muted">
          {textos.nota}
        </label>
        <textarea
          id={idTexto}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value.slice(0, MAXIMO_NOTA))}
          rows={3}
          required
          placeholder={textos.notaPlaceholder}
          className="resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-text placeholder:text-muted-foreground"
        />
      </div>
      <button
        type="submit"
        disabled={guardando || !texto.trim()}
        className="h-10 cursor-pointer self-end rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:cursor-default disabled:opacity-60"
      >
        {guardando ? textos.guardando : textos.agregarNota}
      </button>
    </form>
  );
}
