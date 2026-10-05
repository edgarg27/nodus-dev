import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { busquedaGuardada } from "../../lib/db/schema.ts";
import { busquedaAParams, describirBusqueda, leerBusqueda } from "../../lib/search-params.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { contarPropiedadesPublicas } from "../properties/queries.ts";

// Búsquedas guardadas: cualquier usuario con sesión. La consulta se guarda normalizada (mismo
// orden de parámetros, sin vacíos ni inválidos), así guardar dos veces la misma búsqueda devuelve
// la existente en lugar de duplicarla.

export const MAXIMO_BUSQUEDAS_POR_USUARIO = 20;

type ErrorBusqueda =
  | { code: "unauthenticated"; status: 401; message: string }
  | { code: "not_found"; status: 404; message: string }
  | { code: "conflict_limit"; status: 409; message: string };

export type ResultadoBusqueda<T> = { ok: true; data: T } | { ok: false; error: ErrorBusqueda };

const SIN_SESION = {
  ok: false,
  error: { code: "unauthenticated", status: 401, message: "Sesión requerida" },
} as const;

const NO_ENCONTRADA = {
  ok: false,
  error: { code: "not_found", status: 404, message: "Búsqueda no encontrada" },
} as const;

export type BusquedaGuardadaFila = typeof busquedaGuardada.$inferSelect;

export function normalizarConsulta(consulta: string): string {
  const params = new URLSearchParams(consulta.replace(/^\?/, ""));
  const { filtros, orden } = leerBusqueda((clave) => params.get(clave) ?? undefined);
  return busquedaAParams(filtros, orden).toString();
}

export async function guardarBusqueda(
  actor: ActorAutenticado | null,
  entrada: { consulta: string; nombre?: string },
): Promise<ResultadoBusqueda<{ busqueda: BusquedaGuardadaFila; creada: boolean }>> {
  if (!actor) return SIN_SESION;
  const consulta = normalizarConsulta(entrada.consulta);

  const [existente] = await db
    .select()
    .from(busquedaGuardada)
    .where(and(eq(busquedaGuardada.usuarioId, actor.id), eq(busquedaGuardada.consulta, consulta)));
  if (existente) return { ok: true, data: { busqueda: existente, creada: false } };

  const [conteo] = await db
    .select({ total: count() })
    .from(busquedaGuardada)
    .where(eq(busquedaGuardada.usuarioId, actor.id));
  if ((conteo?.total ?? 0) >= MAXIMO_BUSQUEDAS_POR_USUARIO) {
    return {
      ok: false,
      error: {
        code: "conflict_limit",
        status: 409,
        message: `Puedes guardar hasta ${MAXIMO_BUSQUEDAS_POR_USUARIO} búsquedas. Borra alguna para guardar otra.`,
      },
    };
  }

  const params = new URLSearchParams(consulta);
  const { filtros } = leerBusqueda((clave) => params.get(clave) ?? undefined);
  const nombre = entrada.nombre?.trim() || describirBusqueda(filtros);

  const [fila] = await db
    .insert(busquedaGuardada)
    .values({ usuarioId: actor.id, nombre: nombre.slice(0, 120), consulta })
    .onConflictDoNothing({ target: [busquedaGuardada.usuarioId, busquedaGuardada.consulta] })
    .returning();
  if (fila) return { ok: true, data: { busqueda: fila, creada: true } };

  // Carrera con otra petición idéntica: devuelve la que ganó.
  const [ganadora] = await db
    .select()
    .from(busquedaGuardada)
    .where(and(eq(busquedaGuardada.usuarioId, actor.id), eq(busquedaGuardada.consulta, consulta)));
  if (!ganadora) throw new Error("no se pudo guardar la búsqueda");
  return { ok: true, data: { busqueda: ganadora, creada: false } };
}

export async function eliminarBusqueda(
  actor: ActorAutenticado | null,
  id: string,
): Promise<ResultadoBusqueda<null>> {
  if (!actor) return SIN_SESION;
  const borradas = await db
    .delete(busquedaGuardada)
    .where(and(eq(busquedaGuardada.id, id), eq(busquedaGuardada.usuarioId, actor.id)))
    .returning({ id: busquedaGuardada.id });
  return borradas.length > 0 ? { ok: true, data: null } : NO_ENCONTRADA;
}

// Al abrir una búsqueda guardada se reinicia su contador de "nuevos".
export async function marcarBusquedaVista(
  actor: ActorAutenticado | null,
  id: string,
): Promise<ResultadoBusqueda<BusquedaGuardadaFila>> {
  if (!actor) return SIN_SESION;
  const [fila] = await db
    .update(busquedaGuardada)
    .set({ ultimaVistaEn: new Date() })
    .where(and(eq(busquedaGuardada.id, id), eq(busquedaGuardada.usuarioId, actor.id)))
    .returning();
  return fila ? { ok: true, data: fila } : NO_ENCONTRADA;
}

// Búsquedas del usuario con el total de resultados y cuántos se publicaron desde la última vez
// que la abrió.
export async function listarBusquedasGuardadas(usuarioId: string) {
  const filas = await db
    .select()
    .from(busquedaGuardada)
    .where(eq(busquedaGuardada.usuarioId, usuarioId))
    .orderBy(desc(busquedaGuardada.createdAt));

  return Promise.all(
    filas.map(async (fila) => {
      const params = new URLSearchParams(fila.consulta);
      const { filtros } = leerBusqueda((clave) => params.get(clave) ?? undefined);
      const { financiamiento, ...resto } = filtros;
      const filtrosServidor = {
        ...resto,
        aceptaFinanciamiento: financiamiento === undefined ? undefined : financiamiento === "true",
      };
      const [total, nuevos] = await Promise.all([
        contarPropiedadesPublicas(filtrosServidor),
        contarPropiedadesPublicas(filtrosServidor, { publicadasDesde: fila.ultimaVistaEn }),
      ]);
      return { ...fila, total, nuevos };
    }),
  );
}

export async function estaGuardada(usuarioId: string, consulta: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: busquedaGuardada.id })
    .from(busquedaGuardada)
    .where(
      and(
        eq(busquedaGuardada.usuarioId, usuarioId),
        eq(busquedaGuardada.consulta, normalizarConsulta(consulta)),
      ),
    );
  return Boolean(fila);
}
