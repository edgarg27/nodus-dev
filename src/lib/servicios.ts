import { ANCLA_CAPTIVE_CENTER } from "@/lib/captive-center";
import { FINANCIAMIENTO_VISIBLE } from "@/lib/financiamiento-visibilidad";
import type { Textos } from "@/lib/i18n";

export type ClaveServicio = keyof Textos["servicios"]["items"];

export interface Servicio {
  clave: ClaveServicio;
  // Ancla de su sección en /servicios (el menú del header lleva directo a ella).
  ancla: string;
  // A dónde lleva el botón de la sección: la pantalla que ya ofrece ese servicio.
  href: string;
}

// Servicios de Captive, en el orden en que se muestran en el menú y en /servicios.
const TODOS_LOS_SERVICIOS: readonly Servicio[] = [
  // Su botón baja a la sección completa de Captive Center en la misma página.
  { clave: "captiveCenter", ancla: "captive-center", href: `#${ANCLA_CAPTIVE_CENTER}` },
  { clave: "rentaVenta", ancla: "renta-y-venta", href: "/buscar" },
  { clave: "desdeCero", ancla: "proyectos-desde-cero", href: "/buscar?modalidad=desde_cero" },
  { clave: "financiamiento", ancla: "financiamiento", href: "/buscar?financiamiento=true" },
  { clave: "propietarios", ancla: "propietarios-y-brokers", href: "/publicar" },
];

export const SERVICIOS: readonly Servicio[] = TODOS_LOS_SERVICIOS.filter(
  (servicio) => FINANCIAMIENTO_VISIBLE || servicio.clave !== "financiamiento",
);
