"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { mensajeDeErrorApi } from "@/lib/i18n/errores-api";

interface ContactAgentButtonProps {
  propiedadId: string;
  agenciaNombre: string;
}

// "Contactar": abre un cuadro de mensaje y, al enviarlo, empieza (o retoma) la conversación sobre
// la propiedad y lleva al chat.
export function ContactAgentButton({ propiedadId, agenciaNombre }: ContactAgentButtonProps) {
  const { idioma, t } = useIdioma();
  const r = t.panel.red;
  const router = useRouter();
  const idCampo = useId();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propiedad_id: propiedadId, texto: texto.trim() }),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(mensajeDeErrorApi(cuerpo, idioma, r.errorEnviar));
      }
      router.push(`/mensajes/${cuerpo.data.conversacion_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : r.errorEnviar);
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex h-[42px] w-full cursor-pointer items-center justify-center rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 motion-reduce:transition-none"
      >
        {r.contactar}
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <label htmlFor={idCampo} className="text-xs font-semibold text-muted-foreground">
        {r.mensajePara(agenciaNombre || r.elAgente)}
      </label>
      <textarea
        id={idCampo}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        maxLength={2000}
        rows={3}
        required
        placeholder={r.placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg bg-accent px-4 text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          {enviando ? r.enviando : r.enviarMensaje}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="flex h-10 cursor-pointer items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {r.cancelar}
        </button>
      </div>
    </form>
  );
}
