"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { localeDe } from "@/lib/i18n";
import { iniciales } from "@/lib/initials";
import { ESTADOS_LEAD, type EstadoLead } from "@/lib/leads";

export interface PropiedadDeLeadVista {
  id: string;
  titulo: string | null;
  direccion: string;
  tipo: string;
  modalidad: string;
  solicitudes: number;
  fotoUrl: string | null;
}

export interface PersonaLeadVista {
  buscadorId: string;
  nombre: string;
  email: string;
  telefono: string | null;
  estado: EstadoLead;
  solicitudes: number;
  ultimaFecha: string;
  quiereFinanciamiento: boolean;
  ultimoMensaje: string | null;
  propiedades: PropiedadDeLeadVista[];
}

interface LeadPersonRowProps {
  persona: PersonaLeadVista;
}

export function LeadPersonRow({ persona }: LeadPersonRowProps) {
  const { idioma, t } = useIdioma();
  const b = t.panel.bandeja;
  const etiquetas = t.etiquetas as {
    tipo: Record<string, string>;
    modalidad: Record<string, string>;
  };
  const formateadorFecha = new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoLead>(persona.estado);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const whatsapp = persona.telefono?.replace(/\D/g, "");

  async function cambiarEstado(nuevo: EstadoLead) {
    const anterior = estado;
    setEstado(nuevo);
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/v1/leads/${persona.buscadorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevo }),
      });
      if (!respuesta.ok) throw new Error("fallo");
      // Refresca los conteos del resumen.
      router.refresh();
    } catch {
      setEstado(anterior);
      setError(b.errorEstado);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-display text-sm font-bold text-foreground">
          {iniciales(persona.nombre) || "?"}
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-foreground">{persona.nombre}</h3>
            {persona.quiereFinanciamiento ? (
              <span className="rounded-full bg-warning-foreground px-2.5 py-0.5 text-[11px] font-bold text-warning">
                {t.panel.leads.quiereFinanciamiento}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {[persona.email, persona.telefono].filter(Boolean).join(" · ")}
          </p>
          <p className="text-xs text-muted-foreground/80">
            {b.actividad(
              persona.solicitudes,
              formateadorFecha.format(new Date(persona.ultimaFecha)),
            )}
          </p>
          {persona.ultimoMensaje ? (
            <p className="mt-1 rounded-md bg-background px-3 py-2 text-sm whitespace-pre-line text-foreground">
              {persona.ultimoMensaje}
            </p>
          ) : null}
        </div>
      </div>

      <ul
        className="flex min-w-0 flex-1 flex-col gap-2"
        aria-label={b.propiedadesDe(persona.nombre)}
      >
        {persona.propiedades.map((propiedad) => (
          <li key={propiedad.id} className="flex items-center gap-3">
            <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary/80 to-primary">
              {propiedad.fotoUrl ? (
                // biome-ignore lint/performance/noImgElement: foto subida por el oferente
                <img src={propiedad.fotoUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-semibold text-foreground">
                {propiedad.titulo ?? propiedad.direccion}
              </span>
              <span className="text-xs text-muted-foreground">
                {etiquetas.modalidad[propiedad.modalidad] ?? propiedad.modalidad} ·{" "}
                {etiquetas.tipo[propiedad.tipo] ?? propiedad.tipo}
                {propiedad.solicitudes > 1 ? ` · ${b.nSolicitudes(propiedad.solicitudes)}` : ""}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex shrink-0 flex-col gap-2 lg:w-[190px]">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          {b.estado}
          <select
            value={estado}
            disabled={guardando}
            onChange={(evento) => void cambiarEstado(evento.target.value as EstadoLead)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          >
            {ESTADOS_LEAD.map((valor) => (
              <option key={valor} value={valor}>
                {b.estados[valor]}
              </option>
            ))}
          </select>
        </label>
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <a
          href={`mailto:${persona.email}`}
          className="flex h-9 items-center justify-center rounded-lg border border-input px-3.5 text-[12.5px] font-bold text-foreground transition-colors hover:border-primary"
        >
          {t.panel.leads.responder}
        </a>
        {whatsapp ? (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center justify-center rounded-lg border border-input px-3.5 text-[12.5px] font-bold text-foreground transition-colors hover:border-primary"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
    </article>
  );
}
