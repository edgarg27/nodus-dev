import { and, asc, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad, propiedadFoto } from "../../lib/db/schema.ts";

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

// Fotos de una propiedad, en el orden en que se subieron — usado por el formulario de edición.
export async function obtenerFotosDePropiedad(propiedadId: string) {
  return db
    .select()
    .from(propiedadFoto)
    .where(eq(propiedadFoto.propiedadId, propiedadId))
    .orderBy(asc(propiedadFoto.orden));
}
