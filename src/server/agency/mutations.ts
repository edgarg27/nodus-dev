import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { agenciaContacto, agenciaPerfil } from "../../lib/db/schema.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";

export type ErrorAgencia =
  | { code: "forbidden"; status: 403; message: string }
  | { code: "not_found"; status: 404; message: string }
  | { code: "conflict"; status: 409; message: string };

export type ResultadoAgencia<T> = { ok: true; data: T } | { ok: false; error: ErrorAgencia };

const SIN_PERMISO: ResultadoAgencia<never> = {
  ok: false,
  error: { code: "forbidden", status: 403, message: "Se requiere el rol oferente" },
};

export interface GuardarPerfilInput {
  nombre: string;
  descripcion: string;
  logoUrl?: string | null;
}

// Un perfil por oferente: crearlo y editarlo es el mismo upsert.
export async function guardarPerfilAgencia(
  actor: ActorAutenticado | null,
  input: GuardarPerfilInput,
): Promise<ResultadoAgencia<typeof agenciaPerfil.$inferSelect>> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return SIN_PERMISO;

  const [fila] = await db
    .insert(agenciaPerfil)
    .values({
      usuarioId: actor.id,
      nombre: input.nombre,
      descripcion: input.descripcion,
      logoUrl: input.logoUrl ?? null,
    })
    .onConflictDoUpdate({
      target: agenciaPerfil.usuarioId,
      set: {
        nombre: input.nombre,
        descripcion: input.descripcion,
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      },
    })
    .returning();
  if (!fila) throw new Error("upsert de agencia_perfil no devolvió fila");
  return { ok: true, data: fila };
}

export interface CrearContactoInput {
  tipo: "email" | "telefono" | "whatsapp";
  valor: string;
}

// Idempotente: repetir el mismo (tipo, valor) devuelve el contacto que ya existe.
export async function crearContactoDeAgencia(
  actor: ActorAutenticado | null,
  input: CrearContactoInput,
): Promise<ResultadoAgencia<typeof agenciaContacto.$inferSelect>> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return SIN_PERMISO;

  await db
    .insert(agenciaContacto)
    .values({ usuarioId: actor.id, tipo: input.tipo, valor: input.valor })
    .onConflictDoNothing();
  const [fila] = await db
    .select()
    .from(agenciaContacto)
    .where(
      and(
        eq(agenciaContacto.usuarioId, actor.id),
        eq(agenciaContacto.tipo, input.tipo),
        eq(agenciaContacto.valor, input.valor),
      ),
    );
  if (!fila) throw new Error("insert de agencia_contacto no devolvió fila");
  return { ok: true, data: fila };
}

// Contacto ajeno o inexistente → 404. Las propiedades que lo usaban vuelven al contacto del
// oferente (la FK es `on delete set null`).
export async function borrarContactoDeAgencia(
  actor: ActorAutenticado | null,
  id: string,
): Promise<ResultadoAgencia<{ id: string }>> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return SIN_PERMISO;

  const borrados = await db
    .delete(agenciaContacto)
    .where(and(eq(agenciaContacto.id, id), eq(agenciaContacto.usuarioId, actor.id)))
    .returning({ id: agenciaContacto.id });
  if (borrados.length === 0) {
    return {
      ok: false,
      error: { code: "not_found", status: 404, message: "Contacto no encontrado" },
    };
  }
  return { ok: true, data: { id } };
}
