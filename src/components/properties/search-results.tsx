"use client";

import { MapIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { type DetallesPropiedad, extraerDetalles } from "@/lib/property-details";
import { busquedaAParams, type FiltrosBusqueda, type OrdenBusqueda } from "@/lib/search-params";
import { PropertyMap } from "../map/property-map";
import { PropertyResultCard } from "./property-result-card";

export interface SearchResultProperty extends DetallesPropiedad {
  id: string;
  direccion: string;
  tipo: string;
  modalidad: string;
  estado: string;
  ciudad: string;
  descripcion: string;
  lat: number;
  lng: number;
  fotoUrl: string | null;
}

export type SearchResultsFiltros = FiltrosBusqueda;

interface SearchResultsProps {
  propiedadesIniciales: SearchResultProperty[];
  hasMoreInicial: boolean;
  nextCursorInicial: string | null;
  filtros: SearchResultsFiltros;
  orden: OrdenBusqueda;
  // Ids de todos los favoritos del usuario (también cubren las filas de "Cargar más").
  favoritos?: string[];
  autenticado?: boolean;
}

interface ApiRow extends Partial<Record<keyof DetallesPropiedad, unknown>> {
  id: string;
  direccion: string;
  tipo: string;
  modalidad: string;
  estado: string;
  ciudad: string;
  descripcion: string;
  lat: string;
  lng: string;
  fotoUrl?: string | null;
}

// Contenedor que sincroniza lista y mapa por un `selectedId` compartido — única fuente de
// verdad, sin duplicar estado entre PropertyMap y las tarjetas. También posee la paginación por
// cursor: "Cargar más" pide la siguiente página a `GET /api/v1/properties` con los mismos
// filtros y anexa filas, sin volver a pedir las ya mostradas.
//
// El mapa se monta UNA sola vez y nunca se desmonta al cambiar de layout: en `lg+` es un panel
// lateral fijo; debajo de `lg` se oculta y aparece como hoja inferior de pantalla completa al
// pulsar "Ver mapa" (siguiendo al artifact), cambiando solo las clases del contenedor — nunca
// recreando la instancia de MapLibre.
export function SearchResults({
  propiedadesIniciales,
  hasMoreInicial,
  nextCursorInicial,
  filtros,
  orden,
  favoritos = [],
  autenticado = false,
}: SearchResultsProps) {
  const favoritosSet = new Set(favoritos);
  const [propiedades, setPropiedades] = useState(propiedadesIniciales);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(hasMoreInicial);
  const [cursor, setCursor] = useState(nextCursorInicial);
  const [cargando, setCargando] = useState(false);
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!mapaAbierto) return;
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMapaAbierto(false);
    }
    document.addEventListener("keydown", alPresionarTecla);
    return () => document.removeEventListener("keydown", alPresionarTecla);
  }, [mapaAbierto]);

  async function cargarMas() {
    if (!cursor || cargando) return;
    setCargando(true);

    const params = busquedaAParams(filtros, orden);
    params.set("cursor", cursor);

    const respuesta = await fetch(`/api/v1/properties?${params.toString()}`);
    const cuerpo = await respuesta.json();
    setCargando(false);
    if (!respuesta.ok) return;

    const nuevas: SearchResultProperty[] = cuerpo.data.map((fila: ApiRow) => ({
      id: fila.id,
      direccion: fila.direccion,
      tipo: fila.tipo,
      modalidad: fila.modalidad,
      estado: fila.estado,
      ciudad: fila.ciudad,
      descripcion: fila.descripcion,
      lat: Number(fila.lat),
      lng: Number(fila.lng),
      fotoUrl: fila.fotoUrl ?? null,
      ...extraerDetalles(fila),
    }));
    setPropiedades((prev) => [...prev, ...nuevas]);
    setHasMore(cuerpo.meta.has_more);
    setCursor(cuerpo.meta.next_cursor);
  }

  function alCambiarVisibles(ids: string[]) {
    setVisibleIds(new Set(ids));
  }

  function seleccionarDesdeMapa(id: string) {
    setSelectedId(id);
    setMapaAbierto(false);
    const tarjeta = document.getElementById(`listing-${id}`);
    window.setTimeout(
      () => tarjeta?.scrollIntoView({ behavior: "smooth", block: "center" }),
      mapaAbierto ? 260 : 0,
    );
  }

  if (propiedades.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center text-text-muted">
        <SearchIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
        <span className="text-sm">No encontramos espacios con esos filtros.</span>
      </div>
    );
  }

  const ningunoVisibleEnMapa = visibleIds !== null && visibleIds.size === 0;

  return (
    <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.25fr_1fr]">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {ningunoVisibleEnMapa ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-5 py-14 text-center text-text-muted sm:col-span-2">
            <SearchIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
            <span className="text-sm">Ningún espacio en esta zona del mapa.</span>
            <span className="text-[13px]">
              Aleja el zoom o desplaza el mapa para ver más resultados.
            </span>
          </div>
        ) : (
          <>
            {propiedades.map((propiedad, indice) =>
              visibleIds && !visibleIds.has(propiedad.id) ? null : (
                <PropertyResultCard
                  key={propiedad.id}
                  propiedad={propiedad}
                  numero={indice + 1}
                  selected={propiedad.id === selectedId}
                  onSelect={() => setSelectedId(propiedad.id)}
                  favorito={favoritosSet.has(propiedad.id)}
                  autenticado={autenticado}
                />
              ),
            )}

            {hasMore ? (
              <div className="flex justify-center pt-1 sm:col-span-2">
                <button
                  type="button"
                  disabled={cargando}
                  onClick={cargarMas}
                  className="cursor-pointer rounded-[10px] border border-input bg-surface px-7 py-3 text-sm font-semibold text-text transition-transform duration-150 ease-out hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                >
                  {cargando ? "Cargando…" : "Cargar más espacios"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {mapaAbierto ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setMapaAbierto(false)}
          className="fixed inset-0 z-40 cursor-default border-none bg-primary/55 p-0 lg:hidden"
        />
      ) : null}

      <div
        className={
          mapaAbierto
            ? "fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] max-w-full flex-col gap-3 rounded-t-[20px] bg-surface p-4 shadow-[0_-16px_40px_rgba(11,30,59,0.25)] lg:sticky lg:top-24 lg:z-auto lg:h-[70vh] lg:min-h-[420px] lg:flex-none lg:gap-0 lg:rounded-[20px] lg:border lg:border-border lg:p-0 lg:shadow-none"
            : "hidden lg:sticky lg:top-24 lg:flex lg:h-[70vh] lg:min-h-[420px] lg:flex-col lg:overflow-hidden lg:rounded-[20px] lg:border lg:border-border"
        }
      >
        <div className="flex items-center justify-between lg:hidden">
          <span className="font-display text-base font-bold text-text">Mapa de espacios</span>
          <button
            type="button"
            aria-label="Cerrar mapa"
            onClick={() => setMapaAbierto(false)}
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background"
          >
            <XIcon className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 grow overflow-hidden rounded-[14px] lg:rounded-none">
          <PropertyMap
            propiedades={propiedades}
            selectedId={selectedId}
            onSelect={seleccionarDesdeMapa}
            onVisibleIdsChange={alCambiarVisibles}
          />
        </div>
      </div>

      <button
        type="button"
        aria-label="Ver mapa de espacios"
        aria-haspopup="dialog"
        onClick={() => setMapaAbierto(true)}
        className="fixed right-5 bottom-6 z-30 flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(11,30,59,0.3)] transition-transform duration-150 ease-out hover:-translate-y-px motion-reduce:transition-none lg:hidden"
      >
        <MapIcon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        Ver mapa
      </button>
    </div>
  );
}
