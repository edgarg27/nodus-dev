import { env } from "../../lib/env.ts";

// Origen público del sitio ("https://captivecenter.nodus.mx") para armar redirecciones en Route
// Handlers. En producción la app corre detrás de Caddy y `request.url` trae la dirección interna del
// contenedor (https://0.0.0.0:3000), que el navegador no puede abrir. Por eso manda
// NEXT_PUBLIC_SITE_URL; sin ella (desarrollo local) se usa el origen de la petición. No se usan los
// encabezados Host/X-Forwarded-Host: los controla quien hace la petición.
export function origenPublico(request: Request): string {
  const configurado = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return configurado || new URL(request.url).origin;
}

// URL absoluta dentro del sitio público a partir de una ruta relativa ("/sign-in?error=…").
export function urlPublica(ruta: string, request: Request): URL {
  return new URL(ruta, `${origenPublico(request)}/`);
}
