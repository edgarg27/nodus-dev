"use client";

import {
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent,
  useEffect,
  useId,
  useState,
} from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "./use-debounced-value";

export interface Sugerencia {
  direccion: string;
  lat: number;
  lng: number;
  ciudad: string | null;
  estado: string | null;
  codigoPostal: string | null;
}

interface SugerenciaApi {
  lat: number;
  lng: number;
  direccion_sugerida: string;
  ciudad: string | null;
  estado: string | null;
  codigo_postal: string | null;
}

type AddressAutocompleteProps = Omit<ComponentProps<typeof Input>, "onSelect"> & {
  onSeleccionar: (sugerencia: Sugerencia) => void;
};

const MIN_CARACTERES = 3;
const DEBOUNCE_MS = 300;
const MAX_SUGERENCIAS = 5;

// Combobox accesible (patrón APG list autocomplete) sobre `GET /api/v1/geocode?suggest=true`. El
// valor del input lo sigue poseyendo el formulario (props de `register`); aquí solo se observa lo
// que el usuario teclea para pedir sugerencias. Un fallo o una respuesta lenta nunca bloquea: la
// dirección se puede seguir escribiendo a mano.
export function AddressAutocomplete({
  onSeleccionar,
  onChange,
  onBlur,
  className,
  ...inputProps
}: AddressAutocompleteProps) {
  const idListbox = useId();
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const consulta = useDebouncedValue(texto.trim(), DEBOUNCE_MS);

  useEffect(() => {
    if (consulta.length < MIN_CARACTERES) {
      setSugerencias([]);
      return;
    }

    const controlador = new AbortController();
    fetch(`/api/v1/geocode?q=${encodeURIComponent(consulta)}&suggest=true`, {
      signal: controlador.signal,
    })
      .then(async (respuesta) => {
        if (!respuesta.ok) return [];
        const cuerpo = await respuesta.json();
        return (cuerpo.data?.sugerencias ?? []) as SugerenciaApi[];
      })
      .then((filas) => {
        setSugerencias(
          filas.slice(0, MAX_SUGERENCIAS).map((fila) => ({
            direccion: fila.direccion_sugerida,
            lat: fila.lat,
            lng: fila.lng,
            ciudad: fila.ciudad,
            estado: fila.estado,
            codigoPostal: fila.codigo_postal,
          })),
        );
        setIndiceActivo(-1);
      })
      .catch(() => {
        // Sin sugerencias: el campo sigue siendo texto libre.
      });

    return () => controlador.abort();
  }, [consulta]);

  const listaVisible = abierto && sugerencias.length > 0;

  function seleccionar(sugerencia: Sugerencia) {
    setAbierto(false);
    setIndiceActivo(-1);
    onSeleccionar(sugerencia);
  }

  function alCambiar(evento: ChangeEvent<HTMLInputElement>) {
    onChange?.(evento);
    setTexto(evento.target.value);
    setAbierto(true);
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLInputElement>) {
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
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      setAbierto(false);
      setIndiceActivo(-1);
    }
  }

  return (
    <div className="relative">
      <Input
        {...inputProps}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={listaVisible}
        aria-controls={idListbox}
        aria-activedescendant={indiceActivo >= 0 ? `${idListbox}-${indiceActivo}` : undefined}
        className={className}
        onChange={alCambiar}
        onBlur={(evento) => {
          onBlur?.(evento);
          setAbierto(false);
        }}
        onKeyDown={alPresionarTecla}
      />
      {listaVisible ? (
        <div
          id={idListbox}
          role="listbox"
          aria-label="Sugerencias de dirección"
          className="absolute inset-x-0 top-[calc(100%+4px)] z-20 flex max-h-64 flex-col overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-sm"
        >
          {sugerencias.map((sugerencia, indice) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: el teclado se maneja en el input (combobox, aria-activedescendant); las opciones nunca reciben foco
            <div
              key={`${sugerencia.lat}:${sugerencia.lng}:${sugerencia.direccion}`}
              id={`${idListbox}-${indice}`}
              role="option"
              aria-selected={indice === indiceActivo}
              tabIndex={-1}
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => seleccionar(sugerencia)}
              className={cn(
                "cursor-pointer px-3.5 py-2 text-sm text-foreground",
                indice === indiceActivo ? "bg-muted" : "hover:bg-muted",
              )}
            >
              {sugerencia.direccion}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
