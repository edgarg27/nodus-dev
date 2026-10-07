"use client";

import { SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  bandejaAParams,
  ESTADOS_LEAD,
  type EstadoLead,
  ETIQUETA_ESTADO_LEAD,
  type ParamsBandeja,
} from "@/lib/leads";

interface InboxHeaderProps {
  params: ParamsBandeja;
  resumen: {
    personas: number;
    solicitudes: number;
    porEstado: Record<EstadoLead, number>;
  };
}

function urlDe(params: ParamsBandeja): string {
  const consulta = bandejaAParams(params).toString();
  return consulta ? `/leads?${consulta}` : "/leads";
}

// Resumen (personas, solicitudes y conteo por estado; cada conteo filtra al pulsarlo), buscador y
// exportación. Todo vive en la URL.
export function InboxHeader({ params, resumen }: InboxHeaderProps) {
  const router = useRouter();
  const [texto, setTexto] = useState(params.q);
  const hayFiltros = Boolean(params.q || params.estado);
  const exportar = bandejaAParams({ ...params, pagina: 1 }).toString();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <search className="w-full max-w-[420px]">
          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              router.push(urlDe({ ...params, q: texto.trim(), pagina: 1 }));
            }}
            className="relative w-full"
          >
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              aria-label="Buscar por nombre, correo o teléfono"
              placeholder="Buscar por nombre, correo o teléfono"
              className="h-[46px] w-full rounded-lg border border-input bg-background pr-3.5 pl-10 text-[15px] text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </form>
        </search>
        <div className="flex items-center gap-3">
          {hayFiltros ? (
            <Link
              href="/leads"
              className="flex h-[46px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" aria-hidden="true" />
              Borrar filtros
            </Link>
          ) : null}
          <a
            href={`/api/v1/leads/export${exportar ? `?${exportar}` : ""}`}
            className="flex h-[46px] items-center rounded-lg border border-input px-5 text-sm font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
          >
            Exportar datos
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4 lg:grid-cols-8">
        <div className="flex flex-col gap-1 bg-surface px-4 py-3">
          <dd className="font-display text-2xl leading-none font-bold text-foreground">
            {resumen.personas}
          </dd>
          <dt className="text-xs text-muted-foreground">Personas interesadas</dt>
        </div>
        <div className="flex flex-col gap-1 bg-surface px-4 py-3">
          <dd className="font-display text-2xl leading-none font-bold text-foreground">
            {resumen.solicitudes}
          </dd>
          <dt className="text-xs text-muted-foreground">Solicitudes recibidas</dt>
        </div>
        {ESTADOS_LEAD.map((estado) => {
          const activo = params.estado === estado;
          return (
            <div key={estado} className={`flex flex-col ${activo ? "bg-primary" : "bg-surface"}`}>
              <Link
                href={urlDe({ ...params, estado: activo ? null : estado, pagina: 1 })}
                aria-pressed={activo}
                className={`flex flex-1 flex-col gap-1 px-4 py-3 transition-colors ${
                  activo ? "text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <dd
                  className={`font-display text-2xl leading-none font-bold ${
                    activo ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {resumen.porEstado[estado]}
                </dd>
                <dt
                  className={`text-xs ${activo ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {ETIQUETA_ESTADO_LEAD[estado]}
                </dt>
              </Link>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
