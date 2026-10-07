import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad, usuario } from "../../lib/db/schema.ts";
import { POR_PAGINA_RED } from "../../lib/red-params.ts";
import type { OrdenBusqueda } from "../../lib/search-params.ts";
import { nombresDeAgencia } from "../agency/queries.ts";
import {
  condicionesBusquedaPublica,
  type FiltrosBusquedaPropiedad,
  obtenerPrimerasFotos,
  ordenPorValorDe,
} from "../properties/queries.ts";

// Red inmobiliaria: propiedades de otros oferentes que sus dueños eligieron compartir. Es la única
// consulta que devuelve `comision_pct`, y solo a oferentes autenticados (la ruta lo exige).

export interface FiltrosRedServidor extends FiltrosBusquedaPropiedad {
  exclusiva?: boolean;
  // Excluye las propiedades de este oferente.
  excluirOferenteId?: string;
}

export interface PropiedadDeLaRed {
  id: string;
  tipo: string;
  modalidad: string;
  titulo: string | null;
  direccion: string;
  ciudad: string;
  estado: string;
  descripcion: string;
  precio: number | null;
  moneda: string;
  precioUnidad: string;
  superficieConstruidaM2: number | null;
  superficieTerrenoM2: number | null;
  exclusiva: boolean;
  comisionPct: number | null;
  // Comisión en la moneda de la propiedad; nulo si falta el precio, el porcentaje o (en precio por
  // m²) la superficie.
  comisionEstimada: number | null;
  fotoUrl: string | null;
  oferenteId: string;
  agenciaNombre: string;
  esBroker: boolean;
  publicadaEn: Date;
}

export interface ListadoRed {
  filas: PropiedadDeLaRed[];
  total: number;
  pagina: number;
  porPagina: number;
}

function comisionEstimada(fila: {
  precio: number | null;
  precioUnidad: string;
  comisionPct: number | null;
  superficieConstruidaM2: number | null;
  superficieTerrenoM2: number | null;
}): number | null {
  if (fila.precio === null || fila.comisionPct === null) return null;
  let base = fila.precio;
  if (fila.precioUnidad === "m2") {
    const superficie = fila.superficieConstruidaM2 ?? fila.superficieTerrenoM2;
    if (superficie === null) return null;
    base = fila.precio * superficie;
  }
  return Math.round(base * fila.comisionPct) / 100;
}

export async function listarPropiedadesDeLaRed(
  filtros: FiltrosRedServidor,
  opciones: { orden?: OrdenBusqueda; pagina?: number } = {},
): Promise<ListadoRed> {
  const condiciones = [...condicionesBusquedaPublica(filtros), eq(propiedad.compartidaEnRed, true)];
  if (filtros.exclusiva) condiciones.push(eq(propiedad.exclusiva, true));
  if (filtros.excluirOferenteId)
    condiciones.push(ne(propiedad.oferenteId, filtros.excluirOferenteId));

  const pagina = Math.max(1, opciones.pagina ?? 1);
  const orden = ordenPorValorDe(opciones.orden) ?? [desc(propiedad.createdAt)];

  const [filas, [totalFila]] = await Promise.all([
    db
      .select({ propiedad, esBroker: usuario.isBroker })
      .from(propiedad)
      .innerJoin(usuario, eq(usuario.id, propiedad.oferenteId))
      .where(and(...condiciones))
      .orderBy(...orden, desc(propiedad.id))
      .limit(POR_PAGINA_RED)
      .offset((pagina - 1) * POR_PAGINA_RED),
    db
      .select({ total: count() })
      .from(propiedad)
      .where(and(...condiciones)),
  ]);

  const [fotos, agencias] = await Promise.all([
    obtenerPrimerasFotos(filas.map(({ propiedad: p }) => p.id)),
    nombresDeAgencia(filas.map(({ propiedad: p }) => p.oferenteId)),
  ]);

  return {
    filas: filas.map(({ propiedad: p, esBroker }) => ({
      id: p.id,
      tipo: p.tipo,
      modalidad: p.modalidad,
      titulo: p.titulo,
      direccion: p.direccion,
      ciudad: p.ciudad,
      estado: p.estado,
      descripcion: p.descripcion,
      precio: p.precio,
      moneda: p.moneda,
      precioUnidad: p.precioUnidad,
      superficieConstruidaM2: p.superficieConstruidaM2,
      superficieTerrenoM2: p.superficieTerrenoM2,
      exclusiva: p.exclusiva,
      comisionPct: p.comisionPct,
      comisionEstimada: comisionEstimada(p),
      fotoUrl: fotos.get(p.id)?.storageUrl ?? null,
      oferenteId: p.oferenteId,
      agenciaNombre: agencias.get(p.oferenteId) ?? "",
      esBroker,
      publicadaEn: p.revisadaEn ?? p.createdAt,
    })),
    total: totalFila?.total ?? 0,
    pagina,
    porPagina: POR_PAGINA_RED,
  };
}

export interface EstadisticasRed {
  propiedades: number;
  nuevas48h: number;
  brokers: number;
}

// Números del banner: propiedades compartidas, las aprobadas en las últimas 48 h y brokers con
// propiedades en la Red.
export async function estadisticasDeLaRed(): Promise<EstadisticasRed> {
  const enRed = and(
    eq(propiedad.compartidaEnRed, true),
    eq(propiedad.activo, true),
    eq(propiedad.estadoPublicacion, "publicada"),
  );
  const [totales] = await db
    .select({
      propiedades: count(),
      nuevas: sql<number>`count(*) filter (where coalesce(${propiedad.revisadaEn}, ${propiedad.createdAt}) > now() - interval '48 hours')::int`,
    })
    .from(propiedad)
    .where(enRed);
  const [brokers] = await db
    .select({ total: sql<number>`count(distinct ${propiedad.oferenteId})::int` })
    .from(propiedad)
    .innerJoin(usuario, and(eq(usuario.id, propiedad.oferenteId), eq(usuario.isBroker, true)))
    .where(enRed);
  return {
    propiedades: totales?.propiedades ?? 0,
    nuevas48h: totales?.nuevas ?? 0,
    brokers: brokers?.total ?? 0,
  };
}
