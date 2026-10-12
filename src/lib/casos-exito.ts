import { z } from "zod";
import type { Idioma } from "./i18n/index.ts";

// Casos de éxito de la portada ("Encuentra tu servicio de apoyo"). El admin los captura en
// /admin/casos-exito; el texto principal va en español y el inglés es opcional (sin él, la versión
// en inglés del sitio muestra el español).

export const LIMITES_CASO = { sector: 60, titulo: 120, texto: 600 } as const;

// La portada tiene tres lugares. Un caso sale en la portada si ocupa uno (`posicion`), y cada
// lugar lo ocupa a lo más un caso; sin lugar, el caso queda guardado fuera de la portada. El CHECK
// y el índice único de `caso_exito.posicion` repiten esta regla en la base.
export const POSICIONES_PORTADA = [1, 2, 3] as const;
export const MAX_CASOS_PORTADA = POSICIONES_PORTADA.length;

export interface CasoExito {
  id: string;
  sector: string;
  titulo: string;
  texto: string;
  sectorEn: string | null;
  tituloEn: string | null;
  textoEn: string | null;
  fotoUrl: string | null;
  // Lugar en la portada (1 a 3) o nulo si está fuera de ella.
  posicion: number | null;
}

// Lo que se pinta en la portada, ya en el idioma del visitante.
export interface CasoExitoVista {
  id: string;
  sector: string;
  titulo: string;
  texto: string;
  fotoUrl: string | null;
}

export function casoEnIdioma(caso: CasoExito, idioma: Idioma): CasoExitoVista {
  const ingles = idioma === "en";
  return {
    id: caso.id,
    sector: (ingles ? caso.sectorEn : null) || caso.sector,
    titulo: (ingles ? caso.tituloEn : null) || caso.titulo,
    texto: (ingles ? caso.textoEn : null) || caso.texto,
    fotoUrl: caso.fotoUrl,
  };
}

// Primer lugar de la portada que ningún otro caso ocupa (o `null` si están los tres ocupados).
export function primerLugarLibre(
  casos: readonly Pick<CasoExito, "id" | "posicion">[],
  ignorarId?: string,
): number | null {
  const ocupados = new Set(
    casos.filter((caso) => caso.id !== ignorarId && caso.posicion !== null).map((c) => c.posicion),
  );
  return POSICIONES_PORTADA.find((posicion) => !ocupados.has(posicion)) ?? null;
}

// Validación compartida por la API y el formulario del admin. Cadena vacía o nula en los campos en
// inglés borra la versión en inglés; `posicion` nula saca el caso de la portada.
const opcional = (maximo: number) => z.string().trim().max(maximo).nullable().optional();

export const casoCreacionSchema = z.object({
  sector: z.string().trim().min(1).max(LIMITES_CASO.sector),
  titulo: z.string().trim().min(1).max(LIMITES_CASO.titulo),
  texto: z.string().trim().min(1).max(LIMITES_CASO.texto),
  sectorEn: opcional(LIMITES_CASO.sector),
  tituloEn: opcional(LIMITES_CASO.titulo),
  textoEn: opcional(LIMITES_CASO.texto),
  posicion: z.number().int().min(1).max(MAX_CASOS_PORTADA).nullable().optional(),
});

export const casoEdicionSchema = casoCreacionSchema.partial();
