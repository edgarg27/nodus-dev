"use client";

import { useRouter } from "next/navigation";
import {
  busquedaAParams,
  ETIQUETAS_ORDEN,
  type FiltrosBusqueda,
  ORDENES_BUSQUEDA,
  type OrdenBusqueda,
} from "@/lib/search-params";

interface SortSelectProps {
  filtros: FiltrosBusqueda;
  orden: OrdenBusqueda;
}

// Select independiente en la barra superior (como en el artifact) — cambia y navega de
// inmediato, preservando todos los filtros activos. El mismo campo también vive dentro de
// `SearchFilters` para quien esté en la hoja/popover de filtros.
export function SortSelect({ filtros, orden }: SortSelectProps) {
  const router = useRouter();

  function alCambiar(valor: OrdenBusqueda) {
    const query = busquedaAParams(filtros, valor).toString();
    router.push(query ? `/buscar?${query}` : "/buscar");
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <label htmlFor="orden-desktop" className="text-sm whitespace-nowrap text-text-muted">
        Ordenar por
      </label>
      <select
        id="orden-desktop"
        defaultValue={orden}
        onChange={(evento) => alCambiar(evento.target.value as OrdenBusqueda)}
        className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm text-text"
      >
        {ORDENES_BUSQUEDA.map((opcion) => (
          <option key={opcion} value={opcion}>
            {ETIQUETAS_ORDEN[opcion]}
          </option>
        ))}
      </select>
    </div>
  );
}
