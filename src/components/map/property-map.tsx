"use client";

import { LngLatBounds, Map as MapaLibre, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

export interface PropertyMapPoint {
  id: string;
  direccion: string;
  lat: number;
  lng: number;
}

interface PropertyMapProps {
  propiedades: PropertyMapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const CENTRO_POR_DEFECTO: [number, number] = [-100.9789, 22.1564];
const CLASE_SELECCIONADO = "property-map-marker--seleccionado";

// Mapa de resultados de búsqueda: recibe las propiedades ya resueltas como props, nunca consulta
// la base. Comparte `selectedId` con la lista contenedora (search-results.tsx).
export function PropertyMap({ propiedades, selectedId, onSelect }: PropertyMapProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaLibre | null>(null);
  const marcadoresRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!contenedorRef.current) return;
    const mapa = new MapaLibre({
      container: contenedorRef.current,
      style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
      center: CENTRO_POR_DEFECTO,
      zoom: 11,
    });
    mapaRef.current = mapa;

    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadoresRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    for (const marcador of marcadoresRef.current.values()) marcador.remove();
    marcadoresRef.current.clear();

    for (const punto of propiedades) {
      const marcador = new Marker().setLngLat([punto.lng, punto.lat]).addTo(mapa);
      const elemento = marcador.getElement();
      elemento.setAttribute("role", "button");
      elemento.setAttribute("aria-label", `Ver ${punto.direccion} en el mapa`);
      elemento.tabIndex = 0;
      elemento.addEventListener("click", () => onSelectRef.current(punto.id));
      elemento.addEventListener("keydown", (evento: KeyboardEvent) => {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          onSelectRef.current(punto.id);
        }
      });
      marcadoresRef.current.set(punto.id, marcador);
    }

    if (propiedades.length > 0) {
      const limites = new LngLatBounds();
      for (const punto of propiedades) limites.extend([punto.lng, punto.lat]);
      mapa.fitBounds(limites, { padding: 40, maxZoom: 14, duration: 0 });
    }
  }, [propiedades]);

  useEffect(() => {
    for (const [id, marcador] of marcadoresRef.current) {
      marcador.getElement().classList.toggle(CLASE_SELECCIONADO, id === selectedId);
    }

    if (!selectedId) return;
    const mapa = mapaRef.current;
    const punto = propiedades.find((p) => p.id === selectedId);
    if (!mapa || !punto) return;
    mapa.flyTo({ center: [punto.lng, punto.lat], zoom: 14 });
  }, [selectedId, propiedades]);

  return <div ref={contenedorRef} className="h-[480px] w-full" />;
}
