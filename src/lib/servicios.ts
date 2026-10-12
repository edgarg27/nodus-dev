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
export const SERVICIOS: readonly Servicio[] = [
  { clave: "rentaVenta", ancla: "renta-y-venta", href: "/buscar" },
  { clave: "desdeCero", ancla: "proyectos-desde-cero", href: "/buscar?modalidad=desde_cero" },
  { clave: "financiamiento", ancla: "financiamiento", href: "/buscar?financiamiento=true" },
  { clave: "propietarios", ancla: "propietarios-y-brokers", href: "/publicar" },
];
