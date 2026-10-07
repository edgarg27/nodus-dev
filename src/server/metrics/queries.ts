import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { contactRequest, propiedad, propiedadMetricaDiaria } from "../../lib/db/schema.ts";
import type { PeriodoDias } from "../../lib/periodos.ts";

export interface PuntoMetrica {
  dia: string;
  impresiones: number;
  visitas: number;
}

export interface MetricasDelOferente {
  dias: PeriodoDias;
  totales: {
    impresiones: number;
    visitas: number;
    solicitudes: number;
    leadsDistintos: number;
    publicadas: number;
  };
  // Un punto por cada día del periodo (los días sin actividad van en cero).
  serie: PuntoMetrica[];
}

const HOY_MX = sql`(now() at time zone 'America/Mexico_City')::date`;

function diasDelPeriodo(dias: number): string[] {
  const formato = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" });
  const hoy = Date.now();
  return Array.from({ length: dias }, (_, i) =>
    formato.format(new Date(hoy - (dias - 1 - i) * 86_400_000)),
  );
}

// Totales y serie diaria del periodo, solo de las propiedades activas del oferente.
export async function metricasDelOferente(
  oferenteId: string,
  dias: PeriodoDias,
): Promise<MetricasDelOferente> {
  const propias = db
    .select({ id: propiedad.id })
    .from(propiedad)
    .where(eq(propiedad.oferenteId, oferenteId));

  const filas = await db
    .select({
      dia: sql<string>`${propiedadMetricaDiaria.dia}::text`,
      impresiones: sql<number>`sum(${propiedadMetricaDiaria.impresiones})::int`,
      visitas: sql<number>`sum(${propiedadMetricaDiaria.visitas})::int`,
    })
    .from(propiedadMetricaDiaria)
    .where(
      and(
        inArray(propiedadMetricaDiaria.propiedadId, propias),
        sql`${propiedadMetricaDiaria.dia} > ${HOY_MX} - ${dias}::int`,
      ),
    )
    .groupBy(propiedadMetricaDiaria.dia);
  const porDia = new Map(filas.map((fila) => [fila.dia, fila]));
  const serie = diasDelPeriodo(dias).map((dia) => ({
    dia,
    impresiones: porDia.get(dia)?.impresiones ?? 0,
    visitas: porDia.get(dia)?.visitas ?? 0,
  }));

  const [solicitudes] = await db
    .select({
      total: sql<number>`count(*)::int`,
      leads: sql<number>`count(distinct ${contactRequest.buscadorId})::int`,
    })
    .from(contactRequest)
    .where(
      and(
        eq(contactRequest.oferenteId, oferenteId),
        sql`${contactRequest.createdAt} > now() - make_interval(days => ${dias}::int)`,
      ),
    );
  const [publicadas] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(propiedad)
    .where(
      and(
        eq(propiedad.oferenteId, oferenteId),
        eq(propiedad.activo, true),
        eq(propiedad.estadoPublicacion, "publicada"),
      ),
    );

  return {
    dias,
    totales: {
      impresiones: serie.reduce((suma, punto) => suma + punto.impresiones, 0),
      visitas: serie.reduce((suma, punto) => suma + punto.visitas, 0),
      solicitudes: solicitudes?.total ?? 0,
      leadsDistintos: solicitudes?.leads ?? 0,
      publicadas: publicadas?.total ?? 0,
    },
    serie,
  };
}

export interface MetricasDePropiedad {
  impresiones: number;
  visitas: number;
  solicitudes: number;
}

// Totales históricos por propiedad (impresiones, visitas y solicitudes) para la tabla del oferente.
export async function metricasPorPropiedad(
  propiedadIds: string[],
): Promise<Map<string, MetricasDePropiedad>> {
  const mapa = new Map<string, MetricasDePropiedad>();
  if (propiedadIds.length === 0) return mapa;
  for (const id of propiedadIds) mapa.set(id, { impresiones: 0, visitas: 0, solicitudes: 0 });

  const metricas = await db
    .select({
      id: propiedadMetricaDiaria.propiedadId,
      impresiones: sql<number>`sum(${propiedadMetricaDiaria.impresiones})::int`,
      visitas: sql<number>`sum(${propiedadMetricaDiaria.visitas})::int`,
    })
    .from(propiedadMetricaDiaria)
    .where(inArray(propiedadMetricaDiaria.propiedadId, propiedadIds))
    .groupBy(propiedadMetricaDiaria.propiedadId);
  for (const fila of metricas) {
    const actual = mapa.get(fila.id);
    if (actual) {
      actual.impresiones = fila.impresiones;
      actual.visitas = fila.visitas;
    }
  }

  const solicitudes = await db
    .select({
      id: contactRequest.propiedadId,
      total: sql<number>`count(*)::int`,
    })
    .from(contactRequest)
    .where(inArray(contactRequest.propiedadId, propiedadIds))
    .groupBy(contactRequest.propiedadId);
  for (const fila of solicitudes) {
    const actual = mapa.get(fila.id);
    if (actual) actual.solicitudes = fila.total;
  }
  return mapa;
}
