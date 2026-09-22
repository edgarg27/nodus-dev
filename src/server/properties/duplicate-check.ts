import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad } from "../../lib/db/schema.ts";

export interface OpcionesBuscarDuplicado {
  excluirId?: string;
}

/**
 * Cuenta como duplicado la misma regla que el índice único parcial `uq_propiedad_duplicado` de §4:
 * `activo = true` y `estado_publicacion <> 'rechazada'` y dirección normalizada y coordenadas
 * redondeadas idénticas. `excluirId` deja fuera a la propia fila (edición y reenvío).
 */
export async function buscarDuplicadoActivo(
  direccionNormalizada: string,
  lat: number | string,
  lng: number | string,
  opciones: OpcionesBuscarDuplicado = {},
): Promise<{ id: string } | null> {
  const condiciones = [
    eq(propiedad.activo, true),
    ne(propiedad.estadoPublicacion, "rechazada"),
    eq(propiedad.direccionNormalizada, direccionNormalizada),
    sql`${propiedad.latRedondeada} = round(${lat}::numeric, 5)`,
    sql`${propiedad.lngRedondeada} = round(${lng}::numeric, 5)`,
  ];
  if (opciones.excluirId) {
    condiciones.push(sql`${propiedad.id} <> ${opciones.excluirId}`);
  }

  const [fila] = await db
    .select({ id: propiedad.id })
    .from(propiedad)
    .where(and(...condiciones))
    .limit(1);

  return fila ?? null;
}
