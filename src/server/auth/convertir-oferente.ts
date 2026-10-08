import { eq } from "drizzle-orm";
import type { DatosOferente } from "../../lib/auth/datos-oferente.ts";
import { db } from "../../lib/db/client.ts";
import { agenciaPerfil, usuario } from "../../lib/db/schema.ts";
import { requireRol } from "./guards.ts";
import type { ActorAutenticado } from "./session.ts";

export type ResultadoConvertir =
  | { ok: true }
  | { ok: false; error: { code: "forbidden"; status: 403; message: string } };

// "Publica tu espacio": un buscador pasa a oferente con los mismos datos que pide el registro
// (teléfono, cómo publica y, si es inmobiliaria, su nombre). Solo buscadores: un admin no publica y
// un oferente ya puede hacerlo. Conserva su historial como buscador (favoritos, chats, solicitudes).
export async function convertirEnOferente(
  actor: ActorAutenticado | null,
  datos: DatosOferente,
): Promise<ResultadoConvertir> {
  const permiso = requireRol(actor, "buscador");
  if (!permiso.ok || !actor) {
    return {
      ok: false,
      error: { code: "forbidden", status: 403, message: "Se requiere el rol buscador" },
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(usuario)
      .set({
        rol: "oferente",
        telefono: datos.telefono,
        tipoAnunciante: datos.tipoAnunciante,
        updatedAt: new Date(),
      })
      .where(eq(usuario.id, actor.id));
    if (datos.empresa) {
      await tx
        .insert(agenciaPerfil)
        .values({ usuarioId: actor.id, nombre: datos.empresa })
        .onConflictDoUpdate({ target: agenciaPerfil.usuarioId, set: { nombre: datos.empresa } });
    }
  });
  return { ok: true };
}
