import { en } from "./en.ts";
import { es, type Textos } from "./es.ts";

// Idioma del sitio. Se guarda en la cookie `idioma`; sin cookie, español. Los mensajes de error
// de la API siguen en español.
export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const COOKIE_IDIOMA = "idioma";

export function idiomaValido(valor: string | null | undefined): Idioma {
  return valor === "en" ? "en" : "es";
}

// Idioma a partir del encabezado Cookie de una petición (rutas API, como las exportaciones CSV,
// que no dependen de `cookies()` de Next).
export function idiomaDeCookies(encabezado: string | null): Idioma {
  for (const parte of (encabezado ?? "").split(";")) {
    const [nombre, ...valor] = parte.trim().split("=");
    if (nombre === COOKIE_IDIOMA) return idiomaValido(valor.join("="));
  }
  return "es";
}

const DICCIONARIOS: Record<Idioma, Textos> = { es, en };

export function textosDe(idioma: Idioma): Textos {
  return DICCIONARIOS[idioma];
}

// Formato de números según el idioma (es-MX y en-US usan la coma de miles igual).
export function localeDe(idioma: Idioma): string {
  return idioma === "en" ? "en-US" : "es-MX";
}

export type { Textos };
