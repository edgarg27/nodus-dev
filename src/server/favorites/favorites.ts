import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { favorito, propiedad } from "../../lib/db/schema.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { obtenerPrimerasFotos, obtenerPropiedadPublicaPorId } from "../properties/queries.ts";

// Favoritos: cualquier usuario con sesión, sobre espacios públicos. Agregar y quitar son
// idempotentes (agregar dos veces deja un solo favorito; quitar uno inexistente no falla).

export type ResultadoFavorito =
  | { ok: true }
  | { ok: false; error: { code: "unauthenticated"; status: 401; message: string } }
  | { ok: false; error: { code: "not_found"; status: 404; message: string } };

const SIN_SESION: ResultadoFavorito = {
  ok: false,
  error: { code: "unauthenticated", status: 401, message: "Sesión requerida" },
};

export async function agregarFavorito(
  actor: ActorAutenticado | null,
  propiedadId: string,
): Promise<ResultadoFavorito> {
  if (!actor) return SIN_SESION;
  // Solo espacios públicos: uno pendiente o rechazado responde como inexistente.
  const publica = await obtenerPropiedadPublicaPorId(propiedadId);
  if (!publica) {
    return {
      ok: false,
      error: { code: "not_found", status: 404, message: "Propiedad no encontrada" },
    };
  }
  await db
    .insert(favorito)
    .values({ usuarioId: actor.id, propiedadId })
    .onConflictDoNothing({ target: [favorito.usuarioId, favorito.propiedadId] });
  return { ok: true };
}

export async function quitarFavorito(
  actor: ActorAutenticado | null,
  propiedadId: string,
): Promise<ResultadoFavorito> {
  if (!actor) return SIN_SESION;
  await db
    .delete(favorito)
    .where(and(eq(favorito.usuarioId, actor.id), eq(favorito.propiedadId, propiedadId)));
  return { ok: true };
}

// Ids marcados como favoritos por el usuario entre los dados (o todos si no se pasan).
export async function idsFavoritos(usuarioId: string, propiedadIds?: string[]): Promise<string[]> {
  if (propiedadIds && propiedadIds.length === 0) return [];
  const filas = await db
    .select({ propiedadId: favorito.propiedadId })
    .from(favorito)
    .where(
      and(
        eq(favorito.usuarioId, usuarioId),
        propiedadIds ? inArray(favorito.propiedadId, propiedadIds) : undefined,
      ),
    );
  return filas.map((fila) => fila.propiedadId);
}

// Favoritos del usuario, los más recientes primero. Un espacio que dejó de ser público (dado de
// baja o devuelto a revisión) no se muestra, pero el favorito se conserva por si vuelve.
export async function listarFavoritos(usuarioId: string) {
  const filas = await db
    .select({ propiedad })
    .from(favorito)
    .innerJoin(propiedad, eq(favorito.propiedadId, propiedad.id))
    .where(
      and(
        eq(favorito.usuarioId, usuarioId),
        eq(propiedad.activo, true),
        eq(propiedad.estadoPublicacion, "publicada"),
      ),
    )
    .orderBy(desc(favorito.createdAt));
  const fotos = await obtenerPrimerasFotos(filas.map((fila) => fila.propiedad.id));
  return filas.map(({ propiedad: fila }) => ({
    ...fila,
    fotoUrl: fotos.get(fila.id)?.storageUrl ?? null,
  }));
}
