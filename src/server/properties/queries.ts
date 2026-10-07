import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad, propiedadFoto, usuario } from "../../lib/db/schema.ts";
import {
  dividirOrden,
  type OrdenMisPropiedades,
  POR_PAGINA_MIS_PROPIEDADES,
} from "../../lib/mis-propiedades-params.ts";
import type { FiltrosBusqueda, OrdenBusqueda } from "../../lib/search-params.ts";
import { type MetricasDePropiedad, metricasPorPropiedad } from "../metrics/queries.ts";

const LIMITE_MAXIMO_BUSQUEDA = 50;

export interface FiltrosBusquedaPropiedad
  extends Omit<FiltrosBusqueda, "modalidad" | "tipo" | "estado" | "financiamiento"> {
  modalidad?: string;
  tipo?: string;
  estado?: string;
  aceptaFinanciamiento?: boolean;
}

export type OrdenBusquedaPropiedad = OrdenBusqueda;

// Superficie de referencia: la construida y, si no hay, la de terreno.
const superficieReferencia = sql<
  number | null
>`coalesce(${propiedad.superficieConstruidaM2}, ${propiedad.superficieTerrenoM2})`;

// Precio comparable del espacio completo: un precio por m² se multiplica por la superficie. Sin
// superficie, un precio por m² no se puede comparar y queda nulo (fuera del filtro, al final del
// orden).
const precioTotal = sql<
  number | null
>`case when ${propiedad.precioUnidad} = 'm2' then ${propiedad.precio} * ${superficieReferencia} else ${propiedad.precio} end`;

export interface OpcionesBusquedaPropiedad {
  limit?: number;
  cursor?: string;
  orden?: OrdenBusquedaPropiedad;
}

// Listado del dueño ("mis propiedades") — todas sus filas activas, en cualquier estado de
// publicación (con `estadoPublicacion` y `motivoRechazo` incluidos, ya son columnas de la fila).
export async function listarPropiedadesDelDueno(oferenteId: string): Promise<PropiedadDestacada[]> {
  const filas = await db
    .select()
    .from(propiedad)
    .where(and(eq(propiedad.oferenteId, oferenteId), eq(propiedad.activo, true)));
  return conPrimeraFoto(filas);
}

// Primera foto (por `orden`) de cada propiedad; las que no tienen fotos no aparecen en el Map devuelto.
export async function obtenerPrimerasFotos(idsPropiedad: string[]) {
  const primeraFotoPorPropiedad = new Map<string, typeof propiedadFoto.$inferSelect>();
  if (idsPropiedad.length === 0) return primeraFotoPorPropiedad;

  const fotos = await db
    .select()
    .from(propiedadFoto)
    .where(inArray(propiedadFoto.propiedadId, idsPropiedad))
    .orderBy(asc(propiedadFoto.orden));

  for (const foto of fotos) {
    if (!primeraFotoPorPropiedad.has(foto.propiedadId)) {
      primeraFotoPorPropiedad.set(foto.propiedadId, foto);
    }
  }
  return primeraFotoPorPropiedad;
}

async function conPrimeraFoto(filas: PropiedadFila[]): Promise<PropiedadDestacada[]> {
  const primeraFotoPorPropiedad = await obtenerPrimerasFotos(filas.map((fila) => fila.id));
  return filas.map((fila) => ({ ...fila, foto: primeraFotoPorPropiedad.get(fila.id) ?? null }));
}

// Detalle público: solo `activo` y `publicada`. Un id que existe pero no es público responde
// como si no existiera (404 en la ruta que la consuma).
export async function obtenerPropiedadPublicaPorId(id: string) {
  const [fila] = await db
    .select()
    .from(propiedad)
    .where(
      and(
        eq(propiedad.id, id),
        eq(propiedad.activo, true),
        eq(propiedad.estadoPublicacion, "publicada"),
      ),
    );
  return fila ?? null;
}

// Detalle del dueño: su propia fila en cualquier estado, con `estadoPublicacion` y
// `motivoRechazo`. Un admin no ve un detalle distinto por esta vía — su acceso es la cola del
// paso 24.
export async function obtenerPropiedadDelDuenoPorId(oferenteId: string, id: string) {
  const [fila] = await db
    .select()
    .from(propiedad)
    .where(and(eq(propiedad.id, id), eq(propiedad.oferenteId, oferenteId)));
  return fila ?? null;
}

export function condicionesBusquedaPublica(filtros: FiltrosBusquedaPropiedad) {
  const condiciones = [eq(propiedad.activo, true), eq(propiedad.estadoPublicacion, "publicada")];
  if (filtros.modalidad) condiciones.push(eq(propiedad.modalidad, filtros.modalidad));
  if (filtros.tipo) condiciones.push(eq(propiedad.tipo, filtros.tipo));
  if (filtros.estado) condiciones.push(eq(propiedad.estado, filtros.estado));
  if (filtros.ciudad) condiciones.push(eq(propiedad.ciudad, filtros.ciudad));
  if (filtros.aceptaFinanciamiento !== undefined) {
    condiciones.push(eq(propiedad.aceptaFinanciamiento, filtros.aceptaFinanciamiento));
  }
  if (filtros.precioMin !== undefined || filtros.precioMax !== undefined) {
    condiciones.push(eq(propiedad.moneda, filtros.moneda ?? "MXN"));
    if (filtros.precioMin !== undefined) condiciones.push(gte(precioTotal, filtros.precioMin));
    if (filtros.precioMax !== undefined) condiciones.push(lte(precioTotal, filtros.precioMax));
  }
  if (filtros.superficieMin !== undefined) {
    condiciones.push(gte(superficieReferencia, filtros.superficieMin));
  }
  if (filtros.superficieMax !== undefined) {
    condiciones.push(lte(superficieReferencia, filtros.superficieMax));
  }
  const minimos = [
    [propiedad.banos, filtros.banosMin],
    [propiedad.estacionamientos, filtros.estacionamientosMin],
    [propiedad.alturaLibreM, filtros.alturaLibreMin],
    [propiedad.andenes, filtros.andenesMin],
    [propiedad.potenciaKva, filtros.potenciaKvaMin],
  ] as const;
  for (const [columna, minimo] of minimos) {
    if (minimo !== undefined) condiciones.push(gte(columna, minimo));
  }
  return condiciones;
}

// Búsqueda pública: solo activo y publicada, con filtros exactos y paginación por cursor, tope
// 50 por página. Dos órdenes: "relevancia" (default, id ascendente — el orden histórico, cursor
// = el `id` de la última fila) y "recientes" (createdAt descendente, con `id` como desempate;
// cursor = `"<createdAt ISO>|<id>"`, ya que createdAt por sí solo no es una clave total).
export async function buscarPropiedadesPublicas(
  filtros: FiltrosBusquedaPropiedad,
  opciones: OpcionesBusquedaPropiedad = {},
) {
  const limite = Math.min(opciones.limit ?? LIMITE_MAXIMO_BUSQUEDA, LIMITE_MAXIMO_BUSQUEDA);
  const ordenRecientes = opciones.orden === "recientes";

  const condiciones = condicionesBusquedaPublica(filtros);

  const ordenPorValor = ordenPorValorDe(opciones.orden);
  if (ordenPorValor) {
    // Precio y superficie admiten nulos y empates, así que estos órdenes paginan por posición
    // (cursor = "o:<desplazamiento>") en lugar de por clave.
    const desplazamiento = Number(/^o:(\d+)$/.exec(opciones.cursor ?? "")?.[1] ?? 0);
    const filas = await db
      .select()
      .from(propiedad)
      .where(and(...condiciones))
      .orderBy(...ordenPorValor, asc(propiedad.id))
      .limit(limite + 1)
      .offset(desplazamiento);
    const hasMore = filas.length > limite;
    return {
      data: hasMore ? filas.slice(0, limite) : filas,
      hasMore,
      nextCursor: hasMore ? `o:${desplazamiento + limite}` : null,
    };
  }
  if (opciones.cursor) {
    if (ordenRecientes) {
      const [cursorCreatedAt, cursorId] = opciones.cursor.split("|");
      if (cursorCreatedAt && cursorId) {
        const fecha = new Date(cursorCreatedAt);
        const condicionCursor = or(
          lt(propiedad.createdAt, fecha),
          and(eq(propiedad.createdAt, fecha), lt(propiedad.id, cursorId)),
        );
        if (condicionCursor) condiciones.push(condicionCursor);
      }
    } else {
      condiciones.push(gt(propiedad.id, opciones.cursor));
    }
  }

  const filas = await db
    .select()
    .from(propiedad)
    .where(and(...condiciones))
    .orderBy(
      ...(ordenRecientes ? [desc(propiedad.createdAt), desc(propiedad.id)] : [asc(propiedad.id)]),
    )
    .limit(limite + 1);

  const hasMore = filas.length > limite;
  const pagina = hasMore ? filas.slice(0, limite) : filas;
  const ultima = pagina[pagina.length - 1];
  const nextCursor =
    hasMore && ultima
      ? ordenRecientes
        ? `${ultima.createdAt.toISOString()}|${ultima.id}`
        : ultima.id
      : null;

  return { data: pagina, hasMore, nextCursor };
}

// Los precios en MXN y en USD no se comparan entre sí: al ordenar por precio, los de MXN van
// primero y después los de USD, cada grupo en su orden. Los espacios sin dato van al final.
export function ordenPorValorDe(orden: OrdenBusquedaPropiedad | undefined): SQL[] | null {
  if (orden === "precio_asc" || orden === "precio_desc") {
    const direccion = orden === "precio_asc" ? sql`asc` : sql`desc`;
    return [
      sql`${precioTotal} is null`,
      sql`${propiedad.moneda} <> 'MXN'`,
      sql`${precioTotal} ${direccion}`,
    ];
  }
  if (orden === "superficie_desc") {
    return [sql`${superficieReferencia} is null`, sql`${superficieReferencia} desc`];
  }
  return null;
}

// Total de resultados para el mismo filtro (sin cursor) — usado solo para el encabezado "N
// espacios encontrados"; la paginación en sí no depende de este número.
// `publicadasDesde` cuenta solo las aprobadas después de esa fecha (los "nuevos" de una
// búsqueda guardada).
export async function contarPropiedadesPublicas(
  filtros: FiltrosBusquedaPropiedad,
  opciones: { publicadasDesde?: Date } = {},
): Promise<number> {
  const condiciones = condicionesBusquedaPublica(filtros);
  if (opciones.publicadasDesde)
    condiciones.push(gt(propiedad.revisadaEn, opciones.publicadasDesde));
  const [fila] = await db
    .select({ total: count() })
    .from(propiedad)
    .where(and(...condiciones));
  return fila?.total ?? 0;
}

export interface PropiedadDestacada extends PropiedadFila {
  foto: typeof propiedadFoto.$inferSelect | null;
}

// Portada: las últimas publicadas, con su primera foto — usado por el home. Sin paginación:
// siempre un puñado fijo de tarjetas.
export async function listarPropiedadesPublicadasRecientes(
  limite: number,
): Promise<PropiedadDestacada[]> {
  const filas = await db
    .select()
    .from(propiedad)
    .where(and(eq(propiedad.activo, true), eq(propiedad.estadoPublicacion, "publicada")))
    .orderBy(desc(propiedad.createdAt))
    .limit(limite);

  return conPrimeraFoto(filas);
}

// Fotos de una propiedad, en el orden en que se subieron — usado por el formulario de edición.
export async function obtenerFotosDePropiedad(propiedadId: string) {
  return db
    .select()
    .from(propiedadFoto)
    .where(eq(propiedadFoto.propiedadId, propiedadId))
    .orderBy(asc(propiedadFoto.orden));
}

export interface OferenteResumen {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  isBroker: boolean;
}

export interface PropiedadPendienteDeRevision extends PropiedadFila {
  fotos: (typeof propiedadFoto.$inferSelect)[];
  oferente: OferenteResumen | null;
}

type PropiedadFila = typeof propiedad.$inferSelect;

// Cola de revisión del admin: solo pendiente y activa, la que entró antes primero, con sus
// fotos y los datos de su oferente. Sin paginación en v1: la cola de pendientes es corta.
export async function listarPendientesDeRevision(): Promise<PropiedadPendienteDeRevision[]> {
  const filas = await db
    .select()
    .from(propiedad)
    .where(and(eq(propiedad.activo, true), eq(propiedad.estadoPublicacion, "pendiente")))
    .orderBy(asc(propiedad.updatedAt));

  if (filas.length === 0) return [];

  const idsPropiedad = filas.map((fila) => fila.id);
  const idsOferente = [...new Set(filas.map((fila) => fila.oferenteId))];

  const fotos = await db
    .select()
    .from(propiedadFoto)
    .where(inArray(propiedadFoto.propiedadId, idsPropiedad))
    .orderBy(asc(propiedadFoto.orden));
  const oferentes = await db
    .select({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      isBroker: usuario.isBroker,
    })
    .from(usuario)
    .where(inArray(usuario.id, idsOferente));

  const fotosPorPropiedad = new Map<string, (typeof propiedadFoto.$inferSelect)[]>();
  for (const foto of fotos) {
    const lista = fotosPorPropiedad.get(foto.propiedadId) ?? [];
    lista.push(foto);
    fotosPorPropiedad.set(foto.propiedadId, lista);
  }
  const oferentePorId = new Map(oferentes.map((oferente) => [oferente.id, oferente]));

  return filas.map((fila) => ({
    ...fila,
    fotos: fotosPorPropiedad.get(fila.id) ?? [],
    oferente: oferentePorId.get(fila.oferenteId) ?? null,
  }));
}

// "Espacios similares" de la ficha: públicos, mismo tipo y estado, sin la propiedad actual; primero
// los de la misma modalidad y luego los más recientes.
export async function listarPropiedadesSimilares(
  base: Pick<PropiedadFila, "id" | "tipo" | "estado" | "modalidad">,
  limite = 3,
): Promise<PropiedadDestacada[]> {
  const filas = await db
    .select()
    .from(propiedad)
    .where(
      and(
        eq(propiedad.activo, true),
        eq(propiedad.estadoPublicacion, "publicada"),
        eq(propiedad.tipo, base.tipo),
        eq(propiedad.estado, base.estado),
        ne(propiedad.id, base.id),
      ),
    )
    .orderBy(sql`${propiedad.modalidad} <> ${base.modalidad}`, desc(propiedad.createdAt))
    .limit(limite);
  return conPrimeraFoto(filas);
}

// Para el sitemap: cada espacio público con su última modificación.
export async function listarIdsPublicos(): Promise<{ id: string; updatedAt: Date }[]> {
  return db
    .select({ id: propiedad.id, updatedAt: propiedad.updatedAt })
    .from(propiedad)
    .where(and(eq(propiedad.activo, true), eq(propiedad.estadoPublicacion, "publicada")))
    .orderBy(desc(propiedad.updatedAt));
}

export interface FiltrosMisPropiedades {
  q?: string;
  // Solo estas propiedades (exportar la selección de la tabla).
  ids?: string[];
  estadoPublicacion?: "pendiente" | "publicada" | "rechazada";
  orden?: OrdenMisPropiedades;
  pagina?: number;
  // `null` trae todas las filas (exportación); por defecto, 25 por página.
  porPagina?: number | null;
}

export interface PropiedadDelDueno extends PropiedadDestacada {
  metricas: MetricasDePropiedad;
}

export interface ListadoMisPropiedades {
  filas: PropiedadDelDueno[];
  total: number;
  pagina: number;
  porPagina: number | null;
  // Conteos por estado de publicación sobre la búsqueda (sin el filtro de estado).
  conteos: Record<"todas" | "pendiente" | "publicada" | "rechazada", number>;
}

function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

const sumaMetrica = (columna: "impresiones" | "visitas") =>
  sql<number>`coalesce((select sum(m.${sql.raw(columna)}) from propiedad_metrica_diaria m where m.propiedad_id = ${propiedad.id}), 0)`;
const conteoSolicitudes = sql<number>`(select count(*) from contact_request c where c.propiedad_id = ${propiedad.id})`;

function ordenMisPropiedades(orden: OrdenMisPropiedades): SQL[] {
  const { campo, direccion } = dividirOrden(orden);
  const dir = direccion === "asc" ? sql`asc` : sql`desc`;
  const expresion = {
    fecha: sql`${propiedad.createdAt}`,
    precio: precioTotal,
    impresiones: sumaMetrica("impresiones"),
    visitas: sumaMetrica("visitas"),
    solicitudes: conteoSolicitudes,
  }[campo];
  // Sin precio, la propiedad va al final en cualquier dirección.
  const nulosAlFinal = campo === "precio" ? [sql`${precioTotal} is null`] : [];
  return [...nulosAlFinal, sql`${expresion} ${dir}`, desc(propiedad.id)];
}

// "Mis propiedades" del oferente: búsqueda de texto, filtro por estado de publicación, orden por
// columna y paginación en servidor, con las métricas de cada fila. Solo filas activas del dueño.
export async function listarMisPropiedades(
  oferenteId: string,
  filtros: FiltrosMisPropiedades = {},
): Promise<ListadoMisPropiedades> {
  const base = [eq(propiedad.oferenteId, oferenteId), eq(propiedad.activo, true)];
  if (filtros.ids) {
    base.push(filtros.ids.length > 0 ? inArray(propiedad.id, filtros.ids) : sql`false`);
  }
  const texto = filtros.q?.trim();
  if (texto) {
    const patron = `%${escaparLike(texto)}%`;
    const coincidencia = or(
      ilike(propiedad.referencia, patron),
      ilike(propiedad.titulo, patron),
      ilike(propiedad.direccion, patron),
      ilike(propiedad.ciudad, patron),
    );
    if (coincidencia) base.push(coincidencia);
  }

  const porEstado = await db
    .select({ estadoPublicacion: propiedad.estadoPublicacion, total: count() })
    .from(propiedad)
    .where(and(...base))
    .groupBy(propiedad.estadoPublicacion);
  const conteos = { todas: 0, pendiente: 0, publicada: 0, rechazada: 0 };
  for (const fila of porEstado) {
    if (fila.estadoPublicacion in conteos) {
      conteos[fila.estadoPublicacion as "pendiente" | "publicada" | "rechazada"] = fila.total;
    }
    conteos.todas += fila.total;
  }

  const condiciones = [...base];
  if (filtros.estadoPublicacion) {
    condiciones.push(eq(propiedad.estadoPublicacion, filtros.estadoPublicacion));
  }
  const total = filtros.estadoPublicacion ? conteos[filtros.estadoPublicacion] : conteos.todas;
  const porPagina =
    filtros.porPagina === null ? null : (filtros.porPagina ?? POR_PAGINA_MIS_PROPIEDADES);
  const pagina = Math.max(1, filtros.pagina ?? 1);

  const consulta = db
    .select()
    .from(propiedad)
    .where(and(...condiciones))
    .orderBy(...ordenMisPropiedades(filtros.orden ?? "fecha_desc"))
    .$dynamic();
  const filas = await (porPagina === null
    ? consulta
    : consulta.limit(porPagina).offset((pagina - 1) * porPagina));

  const [conFoto, metricas] = await Promise.all([
    conPrimeraFoto(filas),
    metricasPorPropiedad(filas.map((fila) => fila.id)),
  ]);
  return {
    filas: conFoto.map((fila) => ({
      ...fila,
      metricas: metricas.get(fila.id) ?? { impresiones: 0, visitas: 0, solicitudes: 0 },
    })),
    total,
    pagina,
    porPagina,
    conteos,
  };
}
