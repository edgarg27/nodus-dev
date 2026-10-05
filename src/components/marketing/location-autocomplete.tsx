"use client";

import { cn } from "cn";
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebouncedValue } from "@/components/properties/use-debounced-value";

interface Ciudad {
  ciudad: string;
  estado: string;
}

// Lo que se ve al enfocar el campo sin texto (como la lista de ciudades del artefacto).
const CIUDADES_PRINCIPALES: Ciudad[] = [
  { ciudad: "San Luis Potosí", estado: "San Luis Potosí" },
  { ciudad: "Aguascalientes", estado: "Aguascalientes" },
  { ciudad: "León", estado: "Guanajuato" },
];

const MIN_CARACTERES = 2;
const DEBOUNCE_MS = 250;

interface LocationAutocompleteProps {
  id?: string;
  placeholder: string;
  ariaLabel?: string;
  compacto?: boolean;
  // `position: fixed` medido: necesario cuando un ancestro recorta (`overflow-hidden`) y no hay
  // ancestros con `transform` (un Dialog los tiene, ahí se ancla de forma absoluta).
  flotante?: boolean;
  className?: string;
}

function etiqueta({ ciudad, estado }: Ciudad) {
  return ciudad === estado ? ciudad : `${ciudad}, ${estado}`;
}

function coincide(ciudad: Ciudad, texto: string) {
  return etiqueta(ciudad).toLowerCase().includes(texto.toLowerCase());
}

// Campo `ciudad` del buscador con lista de sugerencias (MapTiler vía `/api/v1/geocode/ciudades`).
// Al elegir una opción el input conserva solo el nombre de la ciudad: es lo que filtra /buscar.
export function LocationAutocomplete({
  id,
  placeholder,
  ariaLabel,
  compacto = false,
  flotante = false,
  className,
}: LocationAutocompleteProps) {
  const idListbox = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [remotas, setRemotas] = useState<Ciudad[] | null>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const texto = valor.trim();
  const consulta = useDebouncedValue(texto, DEBOUNCE_MS);

  useEffect(() => {
    if (consulta.length < MIN_CARACTERES) {
      setRemotas(null);
      return;
    }
    const controlador = new AbortController();
    fetch(`/api/v1/geocode/ciudades?q=${encodeURIComponent(consulta)}`, {
      signal: controlador.signal,
    })
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => setRemotas((cuerpo?.data?.ciudades as Ciudad[] | undefined) ?? null))
      .catch(() => setRemotas(null));
    return () => controlador.abort();
  }, [consulta]);

  const medir = useCallback(() => {
    const campo = inputRef.current;
    if (!campo) return;
    const caja = campo.getBoundingClientRect();
    setRect({ top: Math.round(caja.bottom + 6), left: Math.round(caja.left), width: caja.width });
  }, []);

  useEffect(() => {
    if (!abierto || !flotante) return;
    medir();
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [abierto, flotante, medir]);

  const sugerencias =
    texto.length < MIN_CARACTERES
      ? CIUDADES_PRINCIPALES
      : (remotas ?? CIUDADES_PRINCIPALES.filter((ciudad) => coincide(ciudad, texto)));
  const listaVisible = abierto && sugerencias.length > 0;

  function seleccionar(ciudad: Ciudad) {
    setValor(ciudad.ciudad);
    setAbierto(false);
    setIndiceActivo(-1);
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      setAbierto(false);
      setIndiceActivo(-1);
      return;
    }
    if (!listaVisible) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndiceActivo((previo) => (previo + 1) % sugerencias.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndiceActivo((previo) => (previo <= 0 ? sugerencias.length - 1 : previo - 1));
    } else if (evento.key === "Enter") {
      const elegida = sugerencias[indiceActivo];
      if (!elegida) return;
      evento.preventDefault();
      seleccionar(elegida);
    }
  }

  const lista = listaVisible ? (
    <div
      id={idListbox}
      role="listbox"
      aria-label="Sugerencias de ubicación"
      style={flotante && rect ? { top: rect.top, left: rect.left, width: rect.width } : undefined}
      className={cn(
        "z-[70] flex max-h-[220px] flex-col overflow-y-auto rounded-[10px] border border-border bg-card p-1.5 shadow-[0_12px_28px_rgba(11,30,59,0.14)]",
        flotante ? "fixed" : "absolute top-[calc(100%+6px)] right-0 left-0",
      )}
    >
      {sugerencias.map((ciudad, indice) => (
        <button
          key={`${ciudad.ciudad}|${ciudad.estado}`}
          type="button"
          id={`${idListbox}-${indice}`}
          role="option"
          aria-selected={indice === indiceActivo}
          tabIndex={-1}
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => seleccionar(ciudad)}
          className={cn(
            "block w-full cursor-pointer rounded-lg border-0 px-2.5 py-[9px] text-left text-sm text-foreground transition-colors duration-150 ease-out hover:bg-muted motion-reduce:transition-none",
            indice === indiceActivo && "bg-muted",
          )}
        >
          {etiqueta(ciudad)}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        id={id}
        name="ciudad"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={listaVisible}
        aria-controls={idListbox}
        aria-activedescendant={indiceActivo >= 0 ? `${idListbox}-${indiceActivo}` : undefined}
        placeholder={placeholder}
        value={valor}
        onChange={(evento) => {
          setValor(evento.target.value);
          setIndiceActivo(-1);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={alPresionarTecla}
        className={cn(
          "w-full rounded-[10px] border border-input bg-background text-foreground placeholder:text-muted-foreground",
          compacto ? "h-[42px] rounded-lg px-3 text-sm" : "h-[46px] px-3.5 text-[15px]",
        )}
      />
      {/* Portal: el hero tiene overflow-hidden y backdrop-blur, que recortan o desplazan un `fixed`. */}
      {flotante && lista ? createPortal(lista, document.body) : lista}
    </div>
  );
}
