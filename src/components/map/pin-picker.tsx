"use client";

import { Map as MapaLibre, type MapMouseEvent, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

// maplibre-gl-worker.mjs importa `./maplibre-gl-shared.mjs` con una ruta relativa. Bajo Turbopack,
// referenciarlo vía `new URL("maplibre-gl/dist/...", import.meta.url)` lo copia como asset opaco
// sin su vecino, así que ese import relativo cae en un 404 dentro del propio worker — que muere en
// silencio sin lanzar ningún error visible, dejando el mapa sin estilo ni tiles para siempre.
// `scripts/copy-maplibre-worker.ts` (corrido por `pnpm dev`/`pnpm build`) copia ambos archivos
// juntos a `public/vendor/maplibre-gl/`, una ruta estática que el bundler no toca.
if (typeof window !== "undefined") {
  setWorkerUrl("/vendor/maplibre-gl/maplibre-gl-worker.mjs");
}

const PASO_TECLADO = 0.0005;
const CENTRO_POR_DEFECTO: [number, number] = [-100.9789, 22.1564];

interface PinPickerProps {
  lat: number | undefined;
  lng: number | undefined;
  onChange: (lat: number, lng: number) => void;
}

// Selector de ubicación con MapLibre, junto a los inputs manuales de lat/lng (WCAG 2.5.7: nunca
// los reemplaza). El pin es arrastrable y operable con las flechas del teclado.
export function PinPicker({ lat, lng, onChange }: PinPickerProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaLibre | null>(null);
  const marcadorRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // biome-ignore lint/correctness/useExhaustiveDependencies: el mapa se inicializa una sola vez, con la posición inicial recibida por props; cambios posteriores de lat/lng los aplica el segundo efecto
  useEffect(() => {
    if (!contenedorRef.current) return;

    const centroInicial: [number, number] =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? [lng as number, lat as number]
        : CENTRO_POR_DEFECTO;

    const mapa = new MapaLibre({
      container: contenedorRef.current,
      style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
      center: centroInicial,
      zoom: 12,
    });
    mapaRef.current = mapa;

    const marcador = new Marker({ draggable: true }).setLngLat(centroInicial).addTo(mapa);
    marcadorRef.current = marcador;

    marcador.on("dragend", () => {
      const posicion = marcador.getLngLat();
      onChangeRef.current(posicion.lat, posicion.lng);
    });

    const elementoMarcador = marcador.getElement();
    elementoMarcador.tabIndex = 0;
    elementoMarcador.setAttribute("role", "button");
    elementoMarcador.setAttribute(
      "aria-label",
      "Ubicación de la propiedad: arrastra el pin o usa las flechas del teclado para moverlo",
    );
    elementoMarcador.addEventListener("keydown", (evento: KeyboardEvent) => {
      const posicion = marcador.getLngLat();
      let latActual = posicion.lat;
      let lngActual = posicion.lng;
      if (evento.key === "ArrowUp") latActual += PASO_TECLADO;
      else if (evento.key === "ArrowDown") latActual -= PASO_TECLADO;
      else if (evento.key === "ArrowLeft") lngActual -= PASO_TECLADO;
      else if (evento.key === "ArrowRight") lngActual += PASO_TECLADO;
      else return;

      evento.preventDefault();
      marcador.setLngLat([lngActual, latActual]);
      onChangeRef.current(latActual, lngActual);
    });

    mapa.on("click", (evento: MapMouseEvent) => {
      marcador.setLngLat(evento.lngLat);
      onChangeRef.current(evento.lngLat.lat, evento.lngLat.lng);
    });

    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const actual = marcadorRef.current?.getLngLat();
    if (actual && actual.lat === lat && actual.lng === lng) return;
    marcadorRef.current?.setLngLat([lng as number, lat as number]);
    // Sin recentrar, el pin se mueve fuera de la vista (p. ej. al geocodificar otra ciudad).
    // Acercamiento a nivel calle para que el oferente pueda verificar y ajustar el pin.
    const mapa = mapaRef.current;
    mapa?.easeTo({ center: [lng as number, lat as number], zoom: Math.max(mapa.getZoom(), 16) });
  }, [lat, lng]);

  return <div ref={contenedorRef} className="h-[320px] w-full" />;
}
