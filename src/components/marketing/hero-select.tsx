"use client";

import { cn } from "cn";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface OpcionSelect {
  value: string;
  etiqueta: string;
}

interface HeroSelectProps {
  // El `id` del botón: la etiqueta del campo apunta aquí con `htmlFor`.
  id: string;
  // Nombre con que viaja en el formulario (input oculto), igual que un <select>.
  name: string;
  opciones: OpcionSelect[];
  // `position: fixed` medido y en portal, como la lista de Ubicación: el hero recorta lo que sale
  // de él (`overflow-hidden`). Dentro de un Dialog va anclada de forma absoluta.
  flotante?: boolean;
}

// Selector del buscador de la portada con la misma lista desplegable que el campo Ubicación (en
// lugar del menú nativo del navegador). Patrón APG "select-only combobox".
export function HeroSelect({ id, name, opciones, flotante = false }: HeroSelectProps) {
  const idLista = useId();
  const botonRef = useRef<HTMLButtonElement>(null);
  const [valor, setValor] = useState(opciones[0]?.value ?? "");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const seleccionada = opciones.find((opcion) => opcion.value === valor) ?? opciones[0];

  const medir = useCallback(() => {
    const caja = botonRef.current?.getBoundingClientRect();
    if (caja)
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

  function abrir() {
    setActivo(
      Math.max(
        0,
        opciones.findIndex((opcion) => opcion.value === valor),
      ),
    );
    setAbierto(true);
  }

  function elegir(indice: number) {
    const opcion = opciones[indice];
    if (opcion) setValor(opcion.value);
    setAbierto(false);
    botonRef.current?.focus();
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLButtonElement>) {
    const ultimo = opciones.length - 1;
    if (!abierto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(evento.key)) {
        evento.preventDefault();
        abrir();
      }
      return;
    }
    if (evento.key === "Escape" || evento.key === "Tab") {
      setAbierto(false);
    } else if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setActivo((previo) => Math.min(previo + 1, ultimo));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActivo((previo) => Math.max(previo - 1, 0));
    } else if (evento.key === "Home" || evento.key === "End") {
      evento.preventDefault();
      setActivo(evento.key === "Home" ? 0 : ultimo);
    } else if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      elegir(activo);
    }
  }

  const lista = abierto ? (
    <div
      id={idLista}
      role="listbox"
      aria-labelledby={id}
      style={flotante && rect ? { top: rect.top, left: rect.left, width: rect.width } : undefined}
      className={cn(
        "z-[70] flex max-h-[260px] flex-col overflow-y-auto rounded-[10px] border border-border bg-card p-1.5 shadow-[0_12px_28px_rgba(11,30,59,0.14)]",
        flotante ? "fixed" : "absolute top-[calc(100%+6px)] right-0 left-0",
      )}
    >
      {opciones.map((opcion, indice) => (
        <div
          key={opcion.value}
          id={`${idLista}-${indice}`}
          role="option"
          aria-selected={opcion.value === valor}
          tabIndex={-1}
          onMouseDown={(evento) => evento.preventDefault()}
          onMouseEnter={() => setActivo(indice)}
          onClick={() => elegir(indice)}
          onKeyDown={() => {}}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-[9px] text-left text-sm text-foreground transition-colors duration-150 ease-out motion-reduce:transition-none",
            indice === activo && "bg-muted",
          )}
        >
          {opcion.etiqueta}
          {opcion.value === valor ? (
            <CheckIcon className="size-4 shrink-0 text-accent" aria-hidden="true" />
          ) : null}
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative">
      <input type="hidden" name={name} value={valor} />
      <button
        ref={botonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-activedescendant={abierto ? `${idLista}-${activo}` : undefined}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={alPresionarTecla}
        onBlur={() => setAbierto(false)}
        className="flex h-[46px] w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-input bg-background px-3.5 text-left text-[15px] text-foreground"
      >
        <span className="truncate">{seleccionada?.etiqueta}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
            abierto && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {/* Portal: el hero tiene overflow-hidden y backdrop-blur, que recortan o desplazan un `fixed`. */}
      {flotante && lista ? createPortal(lista, document.body) : lista}
    </div>
  );
}
