"use client";

import { LngLatBounds, Map as MapaLibre, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { RotateCcwIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// maplibre-gl-worker.mjs importa `./maplibre-gl-shared.mjs` con una ruta relativa. Bajo Turbopack,
// referenciarlo vía `new URL("maplibre-gl/dist/...", import.meta.url)` lo copia como asset opaco
// sin su vecino, así que ese import relativo cae en un 404 dentro del propio worker — que muere en
// silencio sin lanzar ningún error visible, dejando el mapa sin estilo ni tiles para siempre.
// `scripts/copy-maplibre-worker.ts` (corrido por `pnpm dev`/`pnpm build`) copia ambos archivos
// juntos a `public/vendor/maplibre-gl/`, una ruta estática que el bundler no toca.
if (typeof window !== "undefined") {
  setWorkerUrl("/vendor/maplibre-gl/maplibre-gl-worker.mjs");
}

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
  onVisibleIdsChange?: (ids: string[]) => void;
  className?: string;
  // El aviso "N de M espacios visibles" solo tiene sentido con varios pines.
  mostrarConteo?: boolean;
}

const CENTRO_POR_DEFECTO: [number, number] = [-100.9789, 22.1564];

const CLASE_CIRCULO_INACTIVO =
  "flex size-8 items-center justify-center rounded-full border-2 border-surface bg-primary font-display text-[13px] font-bold text-primary-foreground shadow-sm transition-transform duration-150 ease-out";
const CLASE_CIRCULO_ACTIVO =
  "flex size-8 items-center justify-center rounded-full border-2 border-surface bg-accent font-display text-[13px] font-bold text-accent-foreground shadow-sm scale-[1.2] transition-transform duration-150 ease-out";
const CLASE_COLA_INACTIVA =
  "-mt-0.5 h-0 w-0 border-x-[6px] border-t-8 border-x-transparent border-t-primary";
const CLASE_COLA_ACTIVA =
  "-mt-0.5 h-0 w-0 border-x-[6px] border-t-8 border-x-transparent border-t-accent";

interface ElementoPin {
  boton: HTMLButtonElement;
  circulo: HTMLSpanElement;
  cola: HTMLSpanElement;
}

function crearElementoPin(numero: number): ElementoPin {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "flex cursor-pointer flex-col items-center border-none bg-transparent p-0";

  const circulo = document.createElement("span");
  circulo.className = CLASE_CIRCULO_INACTIVO;
  circulo.textContent = String(numero);

  const cola = document.createElement("span");
  cola.className = CLASE_COLA_INACTIVA;

  boton.append(circulo, cola);
  return { boton, circulo, cola };
}

function actualizarPin(pin: ElementoPin, activo: boolean) {
  pin.circulo.className = activo ? CLASE_CIRCULO_ACTIVO : CLASE_CIRCULO_INACTIVO;
  pin.cola.className = activo ? CLASE_COLA_ACTIVA : CLASE_COLA_INACTIVA;
}

// Mapa de resultados de búsqueda: recibe las propiedades ya resueltas como props, nunca consulta
// la base. Comparte `selectedId` con la lista contenedora (search-results.tsx). Los marcadores
// numerados y los controles de zoom/reset son DOM propio sobre la instancia de MapLibre — el mapa
// en sí sigue siendo la única fuente de verdad geográfica.
export function PropertyMap({
  propiedades,
  selectedId,
  onSelect,
  onVisibleIdsChange,
  mostrarConteo = true,
  className,
}: PropertyMapProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaLibre | null>(null);
  const marcadoresRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const pinesRef = useRef<globalThis.Map<string, ElementoPin>>(new globalThis.Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onVisibleIdsChangeRef = useRef(onVisibleIdsChange);
  onVisibleIdsChangeRef.current = onVisibleIdsChange;
  const propiedadesRef = useRef(propiedades);
  propiedadesRef.current = propiedades;
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  // Estable entre renders (solo lee refs): puede vivir en la lista de dependencias de los
  // efectos de abajo sin forzarlos a re-suscribirse en cada render.
  const medirVisibles = useCallback(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const limites = mapa.getBounds();
    const visibles = propiedadesRef.current.filter((punto) =>
      limites.contains([punto.lng, punto.lat]),
    );
    setVisibleCount(visibles.length);
    onVisibleIdsChangeRef.current?.(visibles.map((punto) => punto.id));
  }, []);

  useEffect(() => {
    if (!contenedorRef.current) return;
    const mapa = new MapaLibre({
      container: contenedorRef.current,
      style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
      center: CENTRO_POR_DEFECTO,
      zoom: 11,
    });
    mapaRef.current = mapa;

    // El mapa y la lista comparten qué espacios están "visibles": cada vez que el usuario
    // arrastra o hace zoom (o el mapa se reacomoda por `resize`/`fitBounds`), recalculamos qué
    // propiedades caen dentro de `getBounds()` — la lista contenedora filtra sus tarjetas con
    // ese mismo conjunto, igual que el artifact.
    mapa.on("moveend", medirVisibles);

    // El contenedor vive dentro de un panel `sticky`/`overflow-hidden` que puede asentar su
    // tamaño final después de que MapLibre ya midió uno más pequeño (p. ej. al pasar de
    // `hidden` a `lg:block` en el toggle de mapa móvil) — sin este resize, la cámara y los
    // marcadores quedan calculados contra el tamaño viejo y los clics no aciertan donde se ve
    // el pin.
    const observador = new ResizeObserver(() => {
      mapa.resize();
      medirVisibles();
    });
    observador.observe(contenedorRef.current);

    return () => {
      observador.disconnect();
      mapa.off("moveend", medirVisibles);
      mapa.remove();
      mapaRef.current = null;
      marcadoresRef.current.clear();
    };
  }, [medirVisibles]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    for (const marcador of marcadoresRef.current.values()) marcador.remove();
    marcadoresRef.current.clear();
    pinesRef.current.clear();

    propiedades.forEach((punto, indice) => {
      const pin = crearElementoPin(indice + 1);
      pin.boton.setAttribute("aria-label", `Ver ${punto.direccion} en el mapa`);
      pin.boton.addEventListener("click", () => onSelectRef.current(punto.id));
      const marcador = new Marker({ element: pin.boton, anchor: "bottom" })
        .setLngLat([punto.lng, punto.lat])
        .addTo(mapa);
      marcadoresRef.current.set(punto.id, marcador);
      pinesRef.current.set(punto.id, pin);
    });

    if (propiedades.length > 0) {
      const limites = new LngLatBounds();
      for (const punto of propiedades) limites.extend([punto.lng, punto.lat]);
      mapa.fitBounds(limites, { padding: 60, maxZoom: 14, duration: 0 });
    }
    // `fitBounds` no dispara `moveend` si la cámara ya estaba exactamente ahí (p. ej. una sola
    // propiedad sin cambios) — medimos explícito para no depender de ese evento en el estado
    // inicial.
    medirVisibles();
  }, [propiedades, medirVisibles]);

  useEffect(() => {
    // Solo resalta el pin — nunca mueve la cámara. El artifact tampoco lo hace (un clic en pin
    // o tarjeta solo cambia el color activo y hace scroll a la tarjeta), y mover la cámara aquí
    // competiría con la sincronización de "espacios visibles": acercarse a la propiedad
    // seleccionada podría sacar a las demás del viewport y ocultar sus tarjetas.
    for (const [id, pin] of pinesRef.current) {
      actualizarPin(pin, id === selectedId);
    }
  }, [selectedId]);

  function restablecerVista() {
    const mapa = mapaRef.current;
    if (!mapa || propiedadesRef.current.length === 0) return;
    const limites = new LngLatBounds();
    for (const punto of propiedadesRef.current) limites.extend([punto.lng, punto.lat]);
    mapa.fitBounds(limites, { padding: 60, maxZoom: 14, duration: 200 });
  }

  return (
    <div className={className ?? "relative h-full w-full"}>
      <div ref={contenedorRef} className="h-full w-full" />
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label="Acercar mapa"
          onClick={() => mapaRef.current?.zoomIn()}
          className="flex size-[34px] cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-lg font-bold text-text shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px motion-reduce:transition-none"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Alejar mapa"
          onClick={() => mapaRef.current?.zoomOut()}
          className="flex size-[34px] cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-lg font-bold text-text shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px motion-reduce:transition-none"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Restablecer vista del mapa"
          onClick={restablecerVista}
          className="flex size-[34px] cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-text shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px motion-reduce:transition-none"
        >
          <RotateCcwIcon className="size-[15px]" strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
      {mostrarConteo && propiedades.length > 0 && visibleCount !== null ? (
        <p className="pointer-events-none absolute right-3 bottom-3 left-3 m-0 rounded-lg bg-surface/90 px-3 py-2 text-center text-xs text-text">
          {visibleCount === 0
            ? "Ningún espacio en esta zona. Aleja el zoom o desplaza el mapa."
            : `${visibleCount} de ${propiedades.length} espacios visibles en esta zona del mapa.`}
        </p>
      ) : null}
    </div>
  );
}
