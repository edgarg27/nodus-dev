"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { localeDe } from "@/lib/i18n";

export interface MensajeVista {
  id: string;
  texto: string;
  mio: boolean;
  createdAt: string;
}

interface ChatThreadProps {
  conversacionId: string;
  mensajes: MensajeVista[];
}

// Intervalo con el que se revisan mensajes nuevos mientras la conversación está abierta.
const REVISION_MS = 10_000;

export function ChatThread({ conversacionId, mensajes }: ChatThreadProps) {
  const { idioma, t } = useIdioma();
  const m = t.panel.mensajes;
  const formateadorHora = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const router = useRouter();
  const idCampo = useId();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  // Baja al último mensaje cuando llegan o se envían mensajes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: se dispara por la cantidad de mensajes
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length]);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REVISION_MS);
    return () => window.clearInterval(intervalo);
  }, [router]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const contenido = texto.trim();
    if (!contenido) return;
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/v1/conversations/${conversacionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: contenido }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        // Los mensajes de la API están en español; en inglés se muestra el genérico.
        throw new Error((idioma === "es" && cuerpo?.error?.message) || m.errorEnviar);
      }
      setTexto("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : m.errorEnviar);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        aria-live="polite"
        className="flex max-h-[55vh] min-h-[240px] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-surface p-5"
      >
        {mensajes.map((mensaje) => (
          <div
            key={mensaje.id}
            className={`flex max-w-[80%] flex-col gap-1 ${mensaje.mio ? "self-end items-end" : "self-start items-start"}`}
          >
            <p
              className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                mensaje.mio ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {mensaje.texto}
            </p>
            <span className="text-[11px] text-muted-foreground">
              {formateadorHora.format(new Date(mensaje.createdAt))}
            </span>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-2">
        <label htmlFor={idCampo} className="sr-only">
          {m.escribe}
        </label>
        <textarea
          id={idCampo}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          maxLength={2000}
          rows={3}
          placeholder={m.placeholder}
          className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="flex h-[46px] w-fit cursor-pointer items-center rounded-lg bg-accent px-6 text-sm font-bold text-accent-foreground shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:bg-accent/90 disabled:opacity-60 motion-reduce:transition-none"
        >
          {enviando ? m.enviando : m.enviar}
        </button>
      </form>
    </div>
  );
}
