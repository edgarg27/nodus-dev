import {
  BanknoteIcon,
  Building2Icon,
  HammerIcon,
  KeyRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { ClaveServicio } from "@/lib/servicios";

const ICONOS: Record<ClaveServicio, LucideIcon> = {
  rentaVenta: Building2Icon,
  desdeCero: HammerIcon,
  financiamiento: BanknoteIcon,
  propietarios: KeyRoundIcon,
};

interface ServicioIconoProps {
  clave: ClaveServicio;
  className?: string;
}

export function ServicioIcono({ clave, className }: ServicioIconoProps) {
  const Icono = ICONOS[clave];
  return <Icono className={className} aria-hidden="true" />;
}
