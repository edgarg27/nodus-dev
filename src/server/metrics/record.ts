import { sql } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedadMetricaDiaria } from "../../lib/db/schema.ts";
import { log } from "../../lib/logger.ts";
import { verificarLimite } from "../rate-limit/check.ts";

// El día de una métrica es el día calendario de México, no el de UTC del servidor.
const DIA_MX = sql`(now() at time zone 'America/Mexico_City')::date`;

// Una misma IP suma como mucho esta cantidad de visitas por minuto a una propiedad.
const MAX_VISITAS_POR_MINUTO = 3;

interface DatosVisita {
  propiedadId: string;
  oferenteId: string;
  // `null` si quien abre la ficha no tiene sesión.
  actorId: string | null;
  ip: string;
}

// Suma 1 a las visitas de hoy. Nunca lanza: una métrica fallida no puede romper la ficha.
// No cuenta al dueño de la propiedad y recorta las ráfagas de una misma IP.
export async function registrarVisita(datos: DatosVisita): Promise<void> {
  try {
    if (datos.actorId === datos.oferenteId) return;
    const limite = await verificarLimite(`visita:${datos.ip}:${datos.propiedadId}`, {
      max: MAX_VISITAS_POR_MINUTO,
    });
    if (!limite.ok) return;
    await db
      .insert(propiedadMetricaDiaria)
      .values({ propiedadId: datos.propiedadId, dia: DIA_MX, visitas: 1 })
      .onConflictDoUpdate({
        target: [propiedadMetricaDiaria.propiedadId, propiedadMetricaDiaria.dia],
        set: { visitas: sql`${propiedadMetricaDiaria.visitas} + 1` },
      });
  } catch (err) {
    log("error", "no se pudo registrar la visita", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Suma 1 a las impresiones de hoy de cada propiedad mostrada, en una sola sentencia. Nunca lanza.
export async function registrarImpresiones(propiedadIds: string[]): Promise<void> {
  const ids = [...new Set(propiedadIds)];
  if (ids.length === 0) return;
  try {
    await db
      .insert(propiedadMetricaDiaria)
      .values(
        ids.map((propiedadId) => ({
          propiedadId,
          dia: DIA_MX,
          impresiones: 1,
        })),
      )
      .onConflictDoUpdate({
        target: [propiedadMetricaDiaria.propiedadId, propiedadMetricaDiaria.dia],
        set: { impresiones: sql`${propiedadMetricaDiaria.impresiones} + 1` },
      });
  } catch (err) {
    log("error", "no se pudieron registrar las impresiones", {
      cantidad: ids.length,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
