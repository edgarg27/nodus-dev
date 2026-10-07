import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { conversacion, mensaje, propiedad } from "../../lib/db/schema.ts";
import { nombresDeAgencia } from "../agency/queries.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { obtenerPrimerasFotos } from "../properties/queries.ts";

// Chat entre oferentes sobre una propiedad de la Red. El iniciador escribe sobre una propiedad
// ajena y compartida; el otro participante es siempre su dueño. Solo ellos dos ven la conversación.

export type ErrorChat =
  | { code: "forbidden"; status: 403; message: string }
  | { code: "not_found"; status: 404; message: string };

export type ResultadoChat<T> = { ok: true; data: T } | { ok: false; error: ErrorChat };

const SIN_PERMISO: ResultadoChat<never> = {
  ok: false,
  error: { code: "forbidden", status: 403, message: "Se requiere el rol oferente" },
};
const NO_ENCONTRADA: ResultadoChat<never> = {
  ok: false,
  error: { code: "not_found", status: 404, message: "Conversación no encontrada" },
};

export interface PropiedadDeConversacion {
  id: string;
  titulo: string | null;
  direccion: string;
  fotoUrl: string | null;
}

export interface ResumenConversacion {
  id: string;
  propiedad: PropiedadDeConversacion;
  otro: { id: string; nombre: string };
  ultimoMensaje: { texto: string; autorId: string; createdAt: Date } | null;
  noLeidos: number;
}

export interface MensajeDeConversacion {
  id: string;
  texto: string;
  mio: boolean;
  createdAt: Date;
}

export interface DetalleConversacion {
  id: string;
  propiedad: PropiedadDeConversacion;
  otro: { id: string; nombre: string };
  mensajes: MensajeDeConversacion[];
}

// Idempotente en la conversación (una por propiedad e iniciador); cada llamada agrega un mensaje.
export async function iniciarConversacion(
  actor: ActorAutenticado | null,
  propiedadId: string,
  texto: string,
): Promise<ResultadoChat<{ conversacionId: string }>> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return SIN_PERMISO;

  // Solo propiedades de la Red, publicadas y de otro oferente; si no, responde como inexistente.
  const [prop] = await db
    .select({ id: propiedad.id, oferenteId: propiedad.oferenteId })
    .from(propiedad)
    .where(
      and(
        eq(propiedad.id, propiedadId),
        eq(propiedad.activo, true),
        eq(propiedad.estadoPublicacion, "publicada"),
        eq(propiedad.compartidaEnRed, true),
        ne(propiedad.oferenteId, actor.id),
      ),
    );
  if (!prop) return NO_ENCONTRADA;

  await db
    .insert(conversacion)
    .values({ propiedadId: prop.id, iniciadorId: actor.id, duenoId: prop.oferenteId })
    .onConflictDoNothing();
  const [fila] = await db
    .select({ id: conversacion.id })
    .from(conversacion)
    .where(and(eq(conversacion.propiedadId, prop.id), eq(conversacion.iniciadorId, actor.id)));
  if (!fila) throw new Error("conversación no encontrada tras el insert");

  await db.insert(mensaje).values({ conversacionId: fila.id, autorId: actor.id, texto });
  return { ok: true, data: { conversacionId: fila.id } };
}

function esParticipante(actorId: string) {
  return or(eq(conversacion.iniciadorId, actorId), eq(conversacion.duenoId, actorId));
}

export async function enviarMensaje(
  actor: ActorAutenticado | null,
  conversacionId: string,
  texto: string,
): Promise<ResultadoChat<{ id: string }>> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return SIN_PERMISO;

  const [fila] = await db
    .select({ id: conversacion.id })
    .from(conversacion)
    .where(and(eq(conversacion.id, conversacionId), esParticipante(actor.id)));
  if (!fila) return NO_ENCONTRADA;

  const [nuevo] = await db
    .insert(mensaje)
    .values({ conversacionId, autorId: actor.id, texto })
    .returning({ id: mensaje.id });
  if (!nuevo) throw new Error("insert de mensaje no devolvió fila");
  return { ok: true, data: { id: nuevo.id } };
}

async function propiedadesDeConversaciones(propiedadIds: string[]) {
  const mapa = new Map<string, PropiedadDeConversacion>();
  if (propiedadIds.length === 0) return mapa;
  const [filas, fotos] = await Promise.all([
    db
      .select({ id: propiedad.id, titulo: propiedad.titulo, direccion: propiedad.direccion })
      .from(propiedad)
      .where(inArray(propiedad.id, propiedadIds)),
    obtenerPrimerasFotos(propiedadIds),
  ]);
  for (const fila of filas) {
    mapa.set(fila.id, { ...fila, fotoUrl: fotos.get(fila.id)?.storageUrl ?? null });
  }
  return mapa;
}

// Conversaciones del oferente, la de actividad más reciente primero, con los no leídos.
export async function listarConversaciones(
  actor: ActorAutenticado | null,
): Promise<ResultadoChat<ResumenConversacion[]>> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return SIN_PERMISO;

  const filas = await db
    .select()
    .from(conversacion)
    .where(esParticipante(actor.id))
    .orderBy(desc(conversacion.createdAt));
  if (filas.length === 0) return { ok: true, data: [] };

  const ids = filas.map((fila) => fila.id);
  const mensajes = await db
    .select()
    .from(mensaje)
    .where(inArray(mensaje.conversacionId, ids))
    .orderBy(desc(mensaje.createdAt));

  const ultimo = new Map<string, (typeof mensajes)[number]>();
  const noLeidos = new Map<string, number>();
  for (const m of mensajes) {
    if (!ultimo.has(m.conversacionId)) ultimo.set(m.conversacionId, m);
    if (m.autorId !== actor.id && m.leidoEn === null) {
      noLeidos.set(m.conversacionId, (noLeidos.get(m.conversacionId) ?? 0) + 1);
    }
  }

  const otros = filas.map((fila) =>
    fila.iniciadorId === actor.id ? fila.duenoId : fila.iniciadorId,
  );
  const [propiedades, nombres] = await Promise.all([
    propiedadesDeConversaciones(filas.map((fila) => fila.propiedadId)),
    nombresDeAgencia(otros),
  ]);

  const resumen = filas.map((fila, i): ResumenConversacion => {
    const otroId = otros[i] as string;
    const ultimoMensaje = ultimo.get(fila.id);
    return {
      id: fila.id,
      propiedad: propiedades.get(fila.propiedadId) ?? {
        id: fila.propiedadId,
        titulo: null,
        direccion: "",
        fotoUrl: null,
      },
      otro: { id: otroId, nombre: nombres.get(otroId) ?? "" },
      ultimoMensaje: ultimoMensaje
        ? {
            texto: ultimoMensaje.texto,
            autorId: ultimoMensaje.autorId,
            createdAt: ultimoMensaje.createdAt,
          }
        : null,
      noLeidos: noLeidos.get(fila.id) ?? 0,
    };
  });
  // La actividad más reciente (último mensaje o, sin mensajes, la creación) va primero.
  resumen.sort(
    (a, b) =>
      (b.ultimoMensaje?.createdAt.getTime() ?? 0) - (a.ultimoMensaje?.createdAt.getTime() ?? 0),
  );
  return { ok: true, data: resumen };
}

// Mensajes de una conversación, del más antiguo al más nuevo. Abrirla marca como leídos los que
// escribió el otro participante.
export async function obtenerConversacion(
  actor: ActorAutenticado | null,
  conversacionId: string,
): Promise<ResultadoChat<DetalleConversacion>> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return SIN_PERMISO;

  const [fila] = await db
    .select()
    .from(conversacion)
    .where(and(eq(conversacion.id, conversacionId), esParticipante(actor.id)));
  if (!fila) return NO_ENCONTRADA;

  await db
    .update(mensaje)
    .set({ leidoEn: sql`now()` })
    .where(
      and(
        eq(mensaje.conversacionId, conversacionId),
        ne(mensaje.autorId, actor.id),
        isNull(mensaje.leidoEn),
      ),
    );

  const otroId = fila.iniciadorId === actor.id ? fila.duenoId : fila.iniciadorId;
  const [mensajes, propiedades, nombres] = await Promise.all([
    db
      .select()
      .from(mensaje)
      .where(eq(mensaje.conversacionId, conversacionId))
      .orderBy(asc(mensaje.createdAt)),
    propiedadesDeConversaciones([fila.propiedadId]),
    nombresDeAgencia([otroId]),
  ]);

  return {
    ok: true,
    data: {
      id: fila.id,
      propiedad: propiedades.get(fila.propiedadId) ?? {
        id: fila.propiedadId,
        titulo: null,
        direccion: "",
        fotoUrl: null,
      },
      otro: { id: otroId, nombre: nombres.get(otroId) ?? "" },
      mensajes: mensajes.map((m) => ({
        id: m.id,
        texto: m.texto,
        mio: m.autorId === actor.id,
        createdAt: m.createdAt,
      })),
    },
  };
}

// Para el contador de la navegación.
export async function contarMensajesNoLeidos(usuarioId: string): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(mensaje)
    .innerJoin(conversacion, eq(conversacion.id, mensaje.conversacionId))
    .where(
      and(
        or(eq(conversacion.iniciadorId, usuarioId), eq(conversacion.duenoId, usuarioId)),
        ne(mensaje.autorId, usuarioId),
        isNull(mensaje.leidoEn),
      ),
    );
  return fila?.total ?? 0;
}
