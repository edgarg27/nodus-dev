"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Pantallas de acceso: con una sesión válida, el servidor nunca las muestra (redirigirSiHaySesion).
const RUTAS_DE_ACCESO = ["/sign-in", "/sign-up", "/recuperar"];

// El encabezado vive en el layout raíz, y Next no lo vuelve a pintar al navegar dentro del sitio.
// Si la sesión deja de ser válida mientras alguien navega (expiró, se cerró en otra pestaña) y el
// proxy lo manda a iniciar sesión, el encabezado seguiría mostrando su nombre. Llegar a una pantalla
// de acceso con el encabezado de una cuenta abierta pide al servidor el layout de nuevo, ya con el
// estado real. Sin bucle: si la sesión sí fuera válida, el servidor redirige fuera de esa pantalla.
export function SessionSync({ autenticado }: { autenticado: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (autenticado && RUTAS_DE_ACCESO.includes(pathname)) router.refresh();
  }, [autenticado, pathname, router]);

  return null;
}
