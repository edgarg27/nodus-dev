import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad } from "../../lib/db/schema.ts";

// En este paso todo filtra `activo = true` — el filtro por estado de publicación y la vista
// pública llegan en el paso 14.

export async function listarPropiedadesDelDueno(oferenteId: string) {
  return db
    .select()
    .from(propiedad)
    .where(and(eq(propiedad.oferenteId, oferenteId), eq(propiedad.activo, true)));
}

export async function obtenerPropiedadPorId(id: string) {
  const [fila] = await db
    .select()
    .from(propiedad)
    .where(and(eq(propiedad.id, id), eq(propiedad.activo, true)));
  return fila ?? null;
}
