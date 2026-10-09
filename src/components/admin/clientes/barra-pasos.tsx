"use client";

import { CheckIcon } from "lucide-react";
import { PASOS_SOLICITUD, type PasoSolicitud } from "@/lib/clientes";

// Los pasos de la línea, en orden (descartada va aparte).
const LINEA: readonly PasoSolicitud[] = PASOS_SOLICITUD.filter((paso) => paso !== "descartada");

interface BarraPasosProps {
  paso: PasoSolicitud;
  etiquetas: Record<PasoSolicitud, string>;
  // Texto para lectores de pantalla de la lista de pasos.
  titulo: string;
  deshabilitada: boolean;
  onElegir: (paso: PasoSolicitud) => void;
}

// Barra de pasos de una solicitud: se ve en qué paso va y se presiona cualquier paso (adelante o
// atrás) para moverla ahí. Descartada: todos los pasos en gris, y elegir uno la reabre.
export function BarraPasos({ paso, etiquetas, titulo, deshabilitada, onElegir }: BarraPasosProps) {
  const actual = LINEA.indexOf(paso);

  return (
    <ol aria-label={titulo} className="grid grid-cols-4">
      {LINEA.map((opcion, i) => {
        const hecho = actual >= 0 && i < actual;
        const esActual = i === actual;
        return (
          <li key={opcion} className="relative flex flex-col items-center">
            {/* Línea hacia el paso anterior. */}
            {i > 0 ? (
              <span
                aria-hidden="true"
                className={`absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2 ${
                  actual >= 0 && i <= actual ? "bg-accent" : "bg-border"
                }`}
              />
            ) : null}
            <button
              type="button"
              disabled={deshabilitada || esActual}
              aria-current={esActual ? "step" : undefined}
              onClick={() => onElegir(opcion)}
              className="group relative z-10 flex cursor-pointer flex-col items-center gap-1.5 px-1 disabled:cursor-default"
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors duration-150 ease-out ${
                  esActual
                    ? "border-accent bg-accent text-accent-foreground"
                    : hecho
                      ? "border-accent bg-surface text-accent group-hover:bg-accent/10"
                      : "border-border bg-surface text-text-muted group-hover:border-primary"
                }`}
              >
                {hecho ? <CheckIcon className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={`text-center text-xs leading-tight ${
                  esActual ? "font-bold text-text" : "font-medium text-text-muted"
                } group-enabled:group-hover:text-text`}
              >
                {etiquetas[opcion]}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
