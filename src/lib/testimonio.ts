import { z } from "zod";
import type { Idioma } from "./i18n/index.ts";

// Testimonio de la portada (la cita grande antes del cierre). Hay uno solo y el admin lo captura en
// /admin/testimonio; el texto va en español y el inglés es opcional (sin él, la versión en inglés
// del sitio muestra el español). El CHECK de `testimonio` repite estos límites en la base.

export const LIMITES_TESTIMONIO = { cita: 400, nombre: 80, cargo: 120 } as const;

export interface Testimonio {
  cita: string;
  nombre: string;
  cargo: string;
  citaEn: string | null;
  cargoEn: string | null;
  // Apagado, queda guardado pero la portada no muestra la sección.
  visible: boolean;
}

// Lo que se pinta en la portada, ya en el idioma del visitante.
export interface TestimonioVista {
  cita: string;
  nombre: string;
  cargo: string;
}

export function testimonioEnIdioma(testimonio: Testimonio, idioma: Idioma): TestimonioVista {
  const ingles = idioma === "en";
  return {
    cita: (ingles ? testimonio.citaEn : null) || testimonio.cita,
    nombre: testimonio.nombre,
    cargo: (ingles ? testimonio.cargoEn : null) || testimonio.cargo,
  };
}

// Validación compartida por la API y el formulario del admin. Cadena vacía o nula en los campos en
// inglés borra la versión en inglés.
const opcional = (maximo: number) => z.string().trim().max(maximo).nullable().optional();

export const testimonioSchema = z.object({
  cita: z.string().trim().min(1).max(LIMITES_TESTIMONIO.cita),
  nombre: z.string().trim().min(1).max(LIMITES_TESTIMONIO.nombre),
  cargo: z.string().trim().min(1).max(LIMITES_TESTIMONIO.cargo),
  citaEn: opcional(LIMITES_TESTIMONIO.cita),
  cargoEn: opcional(LIMITES_TESTIMONIO.cargo),
  visible: z.boolean(),
});

export type DatosTestimonio = z.infer<typeof testimonioSchema>;
