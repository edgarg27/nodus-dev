"use client";

import { useRouter } from "next/navigation";
import type { SearchFiltersInitial } from "./search-filters";

interface SortSelectProps {
  initial: SearchFiltersInitial & { orden?: string };
}

// Select independiente en la barra superior (como en el artifact) — cambia y navega de
// inmediato, preservando los demás filtros activos. El mismo campo también vive dentro de
// `SearchFilters` para quien esté en la hoja/popover de filtros.
export function SortSelect({ initial }: SortSelectProps) {
  const router = useRouter();

  function alCambiar(valor: string) {
    const params = new URLSearchParams();
    if (initial.modalidad) params.set("modalidad", initial.modalidad);
    if (initial.tipo) params.set("tipo", initial.tipo);
    if (initial.ciudad) params.set("ciudad", initial.ciudad);
    if (valor !== "relevancia") params.set("orden", valor);
    const query = params.toString();
    router.push(query ? `/buscar?${query}` : "/buscar");
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <label htmlFor="orden-desktop" className="text-sm whitespace-nowrap text-text-muted">
        Ordenar por
      </label>
      <select
        id="orden-desktop"
        defaultValue={initial.orden ?? "relevancia"}
        onChange={(evento) => alCambiar(evento.target.value)}
        className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm text-text"
      >
        <option value="relevancia">Relevancia</option>
        <option value="recientes">Más recientes</option>
      </select>
    </div>
  );
}
