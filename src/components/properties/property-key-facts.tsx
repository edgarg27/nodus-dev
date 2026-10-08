import {
  ArrowUpFromLineIcon,
  BathIcon,
  CarIcon,
  LandPlotIcon,
  Maximize2Icon,
  TruckIcon,
  ZapIcon,
} from "lucide-react";
import type { ClaveDatoFicha } from "@/lib/property-details";

const ICONOS: Record<ClaveDatoFicha, typeof BathIcon> = {
  terreno: LandPlotIcon,
  construida: Maximize2Icon,
  banos: BathIcon,
  estacionamientos: CarIcon,
  altura: ArrowUpFromLineIcon,
  andenes: TruckIcon,
  kva: ZapIcon,
};

interface PropertyKeyFactsProps {
  datos: { clave: ClaveDatoFicha; texto: string }[];
  etiqueta: string;
}

// Franja de la ficha con los datos clave del espacio, cada uno con su ícono.
export function PropertyKeyFacts({ datos, etiqueta }: PropertyKeyFactsProps) {
  if (datos.length === 0) return null;
  return (
    <ul
      aria-label={etiqueta}
      className="grid grid-cols-2 gap-x-4 gap-y-5 border-y border-border py-6 sm:grid-cols-3 lg:grid-cols-5"
    >
      {datos.map(({ clave, texto }) => {
        const Icono = ICONOS[clave];
        return (
          <li key={clave} className="flex flex-col items-center gap-2 text-center">
            <Icono className="size-6 text-primary" strokeWidth={1.6} aria-hidden="true" />
            <span className="text-sm font-medium text-text">{texto}</span>
          </li>
        );
      })}
    </ul>
  );
}
