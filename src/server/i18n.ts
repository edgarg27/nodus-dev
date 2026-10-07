import { cookies } from "next/headers";
import {
  COOKIE_IDIOMA,
  type Idioma,
  idiomaValido,
  type Textos,
  textosDe,
} from "../lib/i18n/index.ts";

// Idioma del visitante en Server Components (cookie `idioma`; español por defecto).
export async function obtenerIdioma(): Promise<Idioma> {
  const almacen = await cookies();
  return idiomaValido(almacen.get(COOKIE_IDIOMA)?.value);
}

export async function obtenerTextos(): Promise<{ idioma: Idioma; t: Textos }> {
  const idioma = await obtenerIdioma();
  return { idioma, t: textosDe(idioma) };
}
