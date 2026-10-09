import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../lib/db/client.ts";
import { chatCaptive, mensajeCaptive, usuario } from "../../lib/db/schema.ts";
import type { ActorAutenticado } from "../auth/session.ts";

// Chat de cada cliente con el equipo de Captive. El cliente (cualquier usuario que no sea admin) lo
// ve en Mensajes como "Equipo Captive"; cualquier admin lo atiende desde "Clientes y prospectos".
// Los mensajes de Captive se muestran al cliente sin el nombre de quién los escribió.

export type ErrorChatCaptive =
  | { code: "forbidden"; status: 403; message: string }
  | { code: "not_found"; status: 404; message: string };

export type ResultadoChatCaptive<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorChatCaptive };

export interface MensajeCaptiveVista {
  id: string;
  texto: string;
  // Del lado de quien lo ve: para el cliente, lo escribió él; para Captive, lo escribió Captive.
  mio: boolean;
  createdAt: Date;
  // Solo en la vista de Captive: qué admin lo escribió.
  autor: string | null;
}

const SIN_PERMISO = {
  ok: false,
  error: { code: "forbidden", status: 403, message: "El chat con Captive es para clientes" },
} as const;
const NO_ENCONTRADO = {
  ok: false,
  error: { code: "not_found", status: 404, message: "Cliente no encontrado" },
} as const;

async function chatDe(buscadorId: string): Promise<string | null> {
  const [fila] = await db
    .select({ id: chatCaptive.id })
    .from(chatCaptive)
    .where(eq(chatCaptive.buscadorId, buscadorId));
  return fila?.id ?? null;
}

async function asegurarChat(buscadorId: string): Promise<string> {
  await db.insert(chatCaptive).values({ buscadorId }).onConflictDoNothing();
  const id = await chatDe(buscadorId);
  if (!id) throw new Error("chat_captive no encontrado tras el insert");
  return id;
}

// Mensajes del chat (del más antiguo al más nuevo) y marca como leídos los del otro lado.
async function leerChat(
  chatId: string | null,
  lado: "cliente" | "captive",
): Promise<MensajeCaptiveVista[]> {
  if (!chatId) return [];
  const delOtroLado = lado === "cliente";
  await db
    .update(mensajeCaptive)
    .set({ leidoEn: sql`now()` })
    .where(
      and(
        eq(mensajeCaptive.chatId, chatId),
        eq(mensajeCaptive.deCaptive, delOtroLado),
        isNull(mensajeCaptive.leidoEn),
      ),
    );
  const autor = alias(usuario, "autor");
  const filas = await db
    .select({
      id: mensajeCaptive.id,
      texto: mensajeCaptive.texto,
      deCaptive: mensajeCaptive.deCaptive,
      createdAt: mensajeCaptive.createdAt,
      autor: autor.nombre,
    })
    .from(mensajeCaptive)
    .innerJoin(autor, eq(mensajeCaptive.autorId, autor.id))
    .where(eq(mensajeCaptive.chatId, chatId))
    .orderBy(asc(mensajeCaptive.createdAt));
  return filas.map((fila) => ({
    id: fila.id,
    texto: fila.texto,
    mio: lado === "captive" ? fila.deCaptive : !fila.deCaptive,
    createdAt: fila.createdAt,
    autor: lado === "captive" && fila.deCaptive ? fila.autor : null,
  }));
}

// ----- Lado del cliente -----

export async function obtenerChatDelCliente(
  actor: ActorAutenticado | null,
): Promise<ResultadoChatCaptive<MensajeCaptiveVista[]>> {
  if (!actor || actor.rol === "admin") return SIN_PERMISO;
  return { ok: true, data: await leerChat(await chatDe(actor.id), "cliente") };
}

// No es idempotente: cada llamada agrega un mensaje. Crea el chat si es el primero.
export async function enviarMensajeACaptive(
  actor: ActorAutenticado | null,
  texto: string,
): Promise<ResultadoChatCaptive<{ id: string }>> {
  if (!actor || actor.rol === "admin") return SIN_PERMISO;
  const chatId = await asegurarChat(actor.id);
  const [nuevo] = await db
    .insert(mensajeCaptive)
    .values({ chatId, autorId: actor.id, deCaptive: false, texto })
    .returning({ id: mensajeCaptive.id });
  if (!nuevo) throw new Error("insert de mensaje_captive no devolvió fila");
  return { ok: true, data: { id: nuevo.id } };
}

// Mensajes de Captive que el cliente no ha leído (contador de la navegación).
export async function contarNoLeidosDeCaptive(usuarioId: string): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(mensajeCaptive)
    .innerJoin(chatCaptive, eq(chatCaptive.id, mensajeCaptive.chatId))
    .where(
      and(
        eq(chatCaptive.buscadorId, usuarioId),
        eq(mensajeCaptive.deCaptive, true),
        isNull(mensajeCaptive.leidoEn),
      ),
    );
  return fila?.total ?? 0;
}

// Último mensaje del chat, para la tarjeta fija de Mensajes.
export async function resumenChatDelCliente(
  usuarioId: string,
): Promise<{ ultimo: { texto: string; createdAt: Date } | null; noLeidos: number }> {
  const chatId = await chatDe(usuarioId);
  if (!chatId) return { ultimo: null, noLeidos: 0 };
  const [ultimo] = await db
    .select({ texto: mensajeCaptive.texto, createdAt: mensajeCaptive.createdAt })
    .from(mensajeCaptive)
    .where(eq(mensajeCaptive.chatId, chatId))
    .orderBy(sql`${mensajeCaptive.createdAt} desc`)
    .limit(1);
  return { ultimo: ultimo ?? null, noLeidos: await contarNoLeidosDeCaptive(usuarioId) };
}

// ----- Lado de Captive (admin) -----

async function esCliente(buscadorId: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(and(eq(usuario.id, buscadorId), ne(usuario.rol, "admin")));
  return Boolean(fila);
}

// Abrirlo marca como leídos los mensajes del cliente. Otro rol o un cliente que no existe: null.
export async function obtenerChatParaCaptive(
  actor: ActorAutenticado | null,
  buscadorId: string,
): Promise<MensajeCaptiveVista[] | null> {
  if (actor?.rol !== "admin" || !(await esCliente(buscadorId))) return null;
  return leerChat(await chatDe(buscadorId), "captive");
}

export async function enviarMensajeComoCaptive(
  actor: ActorAutenticado | null,
  buscadorId: string,
  texto: string,
): Promise<ResultadoChatCaptive<{ id: string }>> {
  if (actor?.rol !== "admin" || !(await esCliente(buscadorId))) return NO_ENCONTRADO;
  const chatId = await asegurarChat(buscadorId);
  const [nuevo] = await db
    .insert(mensajeCaptive)
    .values({ chatId, autorId: actor.id, deCaptive: true, texto })
    .returning({ id: mensajeCaptive.id });
  if (!nuevo) throw new Error("insert de mensaje_captive no devolvió fila");
  return { ok: true, data: { id: nuevo.id } };
}

// Clientes con mensajes suyos que Captive no ha leído, con cuántos.
export async function clientesConMensajesSinLeer(
  buscadorIds?: string[],
): Promise<Map<string, number>> {
  if (buscadorIds && buscadorIds.length === 0) return new Map();
  const filas = await db
    .select({ buscadorId: chatCaptive.buscadorId, total: sql<number>`count(*)::int` })
    .from(mensajeCaptive)
    .innerJoin(chatCaptive, eq(chatCaptive.id, mensajeCaptive.chatId))
    .where(
      and(
        eq(mensajeCaptive.deCaptive, false),
        isNull(mensajeCaptive.leidoEn),
        buscadorIds ? inArray(chatCaptive.buscadorId, buscadorIds) : undefined,
      ),
    )
    .groupBy(chatCaptive.buscadorId);
  return new Map(filas.map((fila) => [fila.buscadorId, fila.total]));
}
