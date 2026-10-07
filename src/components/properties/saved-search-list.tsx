"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIdioma } from "@/components/i18n/idioma-provider";

export interface SavedSearchItem {
  id: string;
  nombre: string;
  consulta: string;
  total: number;
  nuevos: number;
}

// Lista de "Mis búsquedas": abrir una marca la búsqueda como vista (reinicia "nuevos") y lleva a
// /buscar con sus filtros; el bote la borra.
export function SavedSearchList({ busquedas }: { busquedas: SavedSearchItem[] }) {
  const t = useIdioma().t.panel.busquedas;
  const router = useRouter();
  const [lista, setLista] = useState(busquedas);
  const [error, setError] = useState<string | null>(null);

  async function abrir(busqueda: SavedSearchItem) {
    // Si marcar como vista falla, igual se abre la búsqueda.
    await fetch(`/api/v1/saved-searches/${busqueda.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vista: true }),
    }).catch(() => null);
    router.push(busqueda.consulta ? `/buscar?${busqueda.consulta}` : "/buscar");
  }

  async function borrar(busqueda: SavedSearchItem) {
    setError(null);
    const anterior = lista;
    setLista((actual) => actual.filter((item) => item.id !== busqueda.id));
    const respuesta = await fetch(`/api/v1/saved-searches/${busqueda.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!respuesta?.ok) {
      setLista(anterior);
      setError(t.errorBorrar);
    }
  }

  if (lista.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-sm text-text-muted">
        {t.vacio}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {lista.map((busqueda) => (
          <li
            key={busqueda.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <button
              type="button"
              onClick={() => void abrir(busqueda)}
              className="flex min-w-0 grow cursor-pointer flex-col items-start gap-1 text-left"
            >
              <span className="font-semibold text-text">{busqueda.nombre}</span>
              <span className="text-[13px] text-text-muted">{t.espacios(busqueda.total)}</span>
            </button>
            {busqueda.nuevos > 0 ? (
              <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
                {t.nuevos(busqueda.nuevos)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void borrar(busqueda)}
              aria-label={t.borrar(busqueda.nombre)}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2Icon className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
