"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";
import {
  ESTADOS_FILTRO,
  type FiltroEstadoMisPropiedades,
  misPropiedadesAParams,
  type ParamsMisPropiedades,
} from "@/lib/mis-propiedades-params";

interface MyListingsToolbarProps {
  params: ParamsMisPropiedades;
  conteos: Record<FiltroEstadoMisPropiedades, number>;
}

// Búsqueda de texto, filtro por estado de publicación y exportación. Todo vive en la URL
// (`/propiedades?q=…&estado=…`), así que se puede compartir y funciona con el botón "atrás".
export function MyListingsToolbar({ params, conteos }: MyListingsToolbarProps) {
  const { t } = useIdioma();
  const tabla = t.panel.tabla;
  const router = useRouter();
  const [texto, setTexto] = useState(params.q);

  function ir(siguiente: ParamsMisPropiedades) {
    const consulta = misPropiedadesAParams(siguiente).toString();
    router.push(consulta ? `/propiedades?${consulta}` : "/propiedades");
  }

  const exportar = misPropiedadesAParams({ ...params, pagina: 1 }).toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <search className="w-full max-w-[420px]">
          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              ir({ ...params, q: texto.trim(), pagina: 1 });
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
              aria-label={tabla.buscarAria}
              placeholder={tabla.buscarPlaceholder}
              className="h-[46px] w-full rounded-lg border border-input bg-background pr-3.5 pl-10 text-[15px] text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </form>
        </search>
        <a
          href={`/api/v1/properties/export${exportar ? `?${exportar}` : ""}`}
          className="flex h-[46px] items-center rounded-lg border border-input px-5 text-sm font-bold text-foreground transition-all duration-150 ease-out hover:-translate-y-px hover:border-primary motion-reduce:transition-none"
        >
          {tabla.exportar}
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ESTADOS_FILTRO.map((estado) => {
          const activo = params.estado === estado;
          return (
            <button
              key={estado}
              type="button"
              aria-pressed={activo}
              onClick={() => ir({ ...params, estado, pagina: 1 })}
              className={`flex h-[38px] cursor-pointer items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-colors duration-150 ease-out ${
                activo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-surface text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {t.panel.filtros[estado]}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  activo
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {conteos[estado]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
