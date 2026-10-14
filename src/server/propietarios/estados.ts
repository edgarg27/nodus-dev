import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad } from "../../lib/db/schema.ts";
import { nombreEstado } from "../../lib/estados.ts";

// Estados donde cada propietario tiene propiedades activas, en orden alfabético: lo que el panel de
// Captive muestra junto al número de propietario ("P-0783 · Aguascalientes, Jalisco").
export async function estadosDePropietarios(ids: string[]): Promise<Map<string, string[]>> {
  const porPropietario = new Map<string, string[]>();
  if (ids.length === 0) return porPropietario;
  const filas = await db
    .selectDistinct({ propietarioId: propiedad.propietarioId, estado: propiedad.estado })
    .from(propiedad)
    .where(and(inArray(propiedad.propietarioId, ids), eq(propiedad.activo, true)));
  for (const fila of filas) {
    porPropietario.set(fila.propietarioId, [
      ...(porPropietario.get(fila.propietarioId) ?? []),
      nombreEstado(fila.estado),
    ]);
  }
  for (const estados of porPropietario.values()) estados.sort((a, b) => a.localeCompare(b, "es"));
  return porPropietario;
}
