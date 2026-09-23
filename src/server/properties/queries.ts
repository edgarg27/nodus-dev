import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad, propiedadFoto } from "../../lib/db/schema.ts";

const LIMITE_MAXIMO_BUSQUEDA = 50;

export interface FiltrosBusquedaPropiedad {
  modalidad?: string;
  tipo?: string;
  estado?: string;
  ciudad?: string;
}

export interface OpcionesBusquedaPropiedad {
  limit?: number;
  cursor?: string;
}

// Listado del dueño ("mis propiedades") — todas sus filas activas, en cualquier estado de
// publicación (con `estadoPublicacion` y `motivoRechazo` incluidos, ya son columnas de la fila).
export async function listarPropiedadesDelDueno(oferenteId: string) {
  return db
    .select()
    .from(propiedad)
    .where(and(eq(propiedad.oferenteId, oferenteId), eq(propiedad.activo, true)));
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

// Búsqueda pública: solo activo y publicada, con filtros exactos y paginación por cursor (id
// ascendente, tope 50 por página). `cursor` es el `id` de la última fila de la página anterior.
export async function buscarPropiedadesPublicas(
  filtros: FiltrosBusquedaPropiedad,
  opciones: OpcionesBusquedaPropiedad = {},
) {
  const limite = Math.min(opciones.limit ?? LIMITE_MAXIMO_BUSQUEDA, LIMITE_MAXIMO_BUSQUEDA);

  const condiciones = [eq(propiedad.activo, true), eq(propiedad.estadoPublicacion, "publicada")];
  if (filtros.modalidad) condiciones.push(eq(propiedad.modalidad, filtros.modalidad));
  if (filtros.tipo) condiciones.push(eq(propiedad.tipo, filtros.tipo));
  if (filtros.estado) condiciones.push(eq(propiedad.estado, filtros.estado));
  if (filtros.ciudad) condiciones.push(eq(propiedad.ciudad, filtros.ciudad));
  if (opciones.cursor) condiciones.push(gt(propiedad.id, opciones.cursor));

  const filas = await db
    .select()
    .from(propiedad)
    .where(and(...condiciones))
    .orderBy(asc(propiedad.id))
    .limit(limite + 1);

  const hasMore = filas.length > limite;
  const pagina = hasMore ? filas.slice(0, limite) : filas;
  const ultima = pagina[pagina.length - 1];

  return { data: pagina, hasMore, nextCursor: hasMore && ultima ? ultima.id : null };
}

// Fotos de una propiedad, en el orden en que se subieron — usado por el formulario de edición.
export async function obtenerFotosDePropiedad(propiedadId: string) {
  return db
    .select()
    .from(propiedadFoto)
    .where(eq(propiedadFoto.propiedadId, propiedadId))
    .orderBy(asc(propiedadFoto.orden));
}
