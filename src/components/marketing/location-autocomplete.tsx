"use client";

import { cn } from "cn";
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIdioma } from "@/components/i18n/idioma-provider";
import { useDebouncedValue } from "@/components/properties/use-debounced-value";
import { type CodigoEstado, ESTADOS_MX } from "@/lib/estados";

interface Ciudad {
  ciudad: string;
  estado: string;
}

// Una opción de la lista: un estado completo (filtra /buscar por `estado`) o una ciudad (`ciudad`).
interface Sugerencia {
  clave: string;
  etiqueta: string;
  // Lo que queda escrito en el campo al elegirla.
  valor: string;
  estado?: CodigoEstado;
}

// Lo que se ve al enfocar el campo sin texto: los 32 estados.
const ESTADOS: Sugerencia[] = ESTADOS_MX.map((estado) => ({
  clave: `estado|${estado.codigo}`,
  etiqueta: estado.nombre,
  valor: estado.nombre,
  estado: estado.codigo,
}));

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

function sinAcentos(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function coincide(sugerencia: Sugerencia, texto: string) {
  return sinAcentos(sugerencia.etiqueta).includes(sinAcentos(texto));
}

function sugerenciaDeCiudad({ ciudad, estado }: Ciudad): Sugerencia {
  return { clave: `ciudad|${ciudad}|${estado}`, etiqueta: `${ciudad}, ${estado}`, valor: ciudad };
}

// Campo de ubicación del buscador: sin texto lista los estados; al escribir suma las ciudades que
// sugiere MapTiler (`/api/v1/geocode/ciudades`). Un estado elegido se envía como `estado` (su
// código); una ciudad, o el texto libre, como `ciudad`: son los dos filtros de /buscar.
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
  const { t } = useIdioma();
  const [valor, setValor] = useState("");
  const [estadoElegido, setEstadoElegido] = useState<CodigoEstado | null>(null);
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
      ? ESTADOS
      : [
          ...ESTADOS.filter((estado) => coincide(estado, texto)),
          ...(remotas ?? []).map(sugerenciaDeCiudad),
        ];
  const listaVisible = abierto && sugerencias.length > 0;

  function seleccionar(sugerencia: Sugerencia) {
    setValor(sugerencia.valor);
    setEstadoElegido(sugerencia.estado ?? null);
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
      aria-label={t.hero.sugerencias}
      style={flotante && rect ? { top: rect.top, left: rect.left, width: rect.width } : undefined}
      className={cn(
        "z-[70] flex max-h-[220px] flex-col overflow-y-auto rounded-[10px] border border-border bg-card p-1.5 shadow-[0_12px_28px_rgba(11,30,59,0.14)]",
        flotante ? "fixed" : "absolute top-[calc(100%+6px)] right-0 left-0",
      )}
    >
      {sugerencias.map((sugerencia, indice) => (
        <button
          key={sugerencia.clave}
          type="button"
          id={`${idListbox}-${indice}`}
          role="option"
          aria-selected={indice === indiceActivo}
          tabIndex={-1}
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => seleccionar(sugerencia)}
          className={cn(
            "block w-full cursor-pointer rounded-lg border-0 px-2.5 py-[9px] text-left text-sm text-foreground transition-colors duration-150 ease-out hover:bg-muted motion-reduce:transition-none",
            indice === indiceActivo && "bg-muted",
          )}
        >
          {sugerencia.etiqueta}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        id={id}
        name={estadoElegido ? undefined : "ciudad"}
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
          setEstadoElegido(null);
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
      {estadoElegido ? <input type="hidden" name="estado" value={estadoElegido} /> : null}
      {/* Portal: el hero tiene overflow-hidden y backdrop-blur, que recortan o desplazan un `fixed`. */}
      {flotante && lista ? createPortal(lista, document.body) : lista}
    </div>
  );
}
