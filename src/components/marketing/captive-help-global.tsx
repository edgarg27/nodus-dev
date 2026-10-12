"use client";

import { usePathname } from "next/navigation";
import { CaptiveHelp } from "@/components/marketing/captive-help";

// Pantallas donde la ayuda estorba o es redundante: el propio chat, el panel de administración,
// el registro/ingreso y la publicación de espacios.
const RUTAS_SIN_AYUDA = [
  "/admin",
  "/mensajes",
  "/sign-in",
  "/sign-up",
  "/crear-contrasena",
  "/recuperar",
  "/auth",
  "/publicar",
  "/propiedades/nueva",
];

interface CaptiveHelpGlobalProps {
  href: string;
  autenticado: boolean;
}

// Botón de ayuda en la esquina inferior derecha de todo el sitio. Las pantallas de búsqueda montan
// el suyo (con la búsqueda como borrador) y este se oculta por CSS.
export function CaptiveHelpGlobal({ href, autenticado }: CaptiveHelpGlobalProps) {
  const ruta = usePathname();
  if (RUTAS_SIN_AYUDA.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`))) {
    return null;
  }
  return (
    <div className="[body:has([data-captive-help])_&]:hidden">
      <CaptiveHelp href={href} autenticado={autenticado} global />
    </div>
  );
}
