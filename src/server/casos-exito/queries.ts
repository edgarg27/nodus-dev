import { asc, eq, isNotNull } from "drizzle-orm";
import type { CasoExito } from "../../lib/casos-exito.ts";
import { db } from "../../lib/db/client.ts";
import { casoExito } from "../../lib/db/schema.ts";

function aCaso(fila: typeof casoExito.$inferSelect): CasoExito {
  return {
    id: fila.id,
    sector: fila.sector,
    titulo: fila.titulo,
    texto: fila.texto,
    sectorEn: fila.sectorEn,
    tituloEn: fila.tituloEn,
    textoEn: fila.textoEn,
    fotoUrl: fila.fotoUrl,
    posicion: fila.posicion,
  };
}

// Portada: los casos que ocupan un lugar (1 a 3), en el orden de su lugar.
export async function listarCasosDePortada(): Promise<CasoExito[]> {
  const filas = await db
    .select()
    .from(casoExito)
    .where(isNotNull(casoExito.posicion))
    .orderBy(asc(casoExito.posicion));
  return filas.map(aCaso);
}

// Panel de administración: todos; primero los de la portada (por lugar) y luego los guardados,
// del más antiguo al más nuevo (`asc` deja los nulos al final).
export async function listarTodosLosCasos(): Promise<CasoExito[]> {
  const filas = await db
    .select()
    .from(casoExito)
    .orderBy(asc(casoExito.posicion), asc(casoExito.createdAt));
  return filas.map(aCaso);
}

export async function obtenerCaso(id: string): Promise<CasoExito | null> {
  const [fila] = await db.select().from(casoExito).where(eq(casoExito.id, id));
  return fila ? aCaso(fila) : null;
}
