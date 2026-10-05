import { and, asc, count, desc, eq, gt, inArray, lt, or } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad, propiedadFoto, usuario } from "../../lib/db/schema.ts";

const LIMITE_MAXIMO_BUSQUEDA = 50;

export interface FiltrosBusquedaPropiedad {
  modalidad?: string;
  tipo?: string;
  estado?: string;
  ciudad?: string;
  aceptaFinanciamiento?: boolean;
}

export type OrdenBusquedaPropiedad = "relevancia" | "recientes";

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

function condicionesBusquedaPublica(filtros: FiltrosBusquedaPropiedad) {
  const condiciones = [eq(propiedad.activo, true), eq(propiedad.estadoPublicacion, "publicada")];
  if (filtros.modalidad) condiciones.push(eq(propiedad.modalidad, filtros.modalidad));
  if (filtros.tipo) condiciones.push(eq(propiedad.tipo, filtros.tipo));
  if (filtros.estado) condiciones.push(eq(propiedad.estado, filtros.estado));
  if (filtros.ciudad) condiciones.push(eq(propiedad.ciudad, filtros.ciudad));
  if (filtros.aceptaFinanciamiento !== undefined) {
    condiciones.push(eq(propiedad.aceptaFinanciamiento, filtros.aceptaFinanciamiento));
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

// Total de resultados para el mismo filtro (sin cursor) — usado solo para el encabezado "N
// espacios encontrados"; la paginación en sí no depende de este número.
export async function contarPropiedadesPublicas(
  filtros: FiltrosBusquedaPropiedad,
): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(propiedad)
    .where(and(...condicionesBusquedaPublica(filtros)));
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
