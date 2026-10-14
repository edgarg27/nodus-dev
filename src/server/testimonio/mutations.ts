import { eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { testimonio } from "../../lib/db/schema.ts";
import type { DatosTestimonio, Testimonio } from "../../lib/testimonio.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { filaDelTestimonio, obtenerTestimonio } from "./queries.ts";

export type ResultadoTestimonio =
  | { ok: true; data: Testimonio }
  | { ok: false; error: { code: "not_found"; status: 404; message: string } };

const vacioANulo = (valor: string | null | undefined) => valor?.trim() || null;

// Guarda el testimonio de la portada: crea la fila la primera vez y después siempre actualiza la
// misma. Solo admin; cualquier otro actor recibe 404 (regla de /api/v1/admin/**). Idempotente.
export async function guardarTestimonio(
  actor: ActorAutenticado | null,
  datos: DatosTestimonio,
): Promise<ResultadoTestimonio> {
  if (!requireRol(actor, "admin").ok) {
    return { ok: false, error: { code: "not_found", status: 404, message: "No encontrado" } };
  }

  const valores = {
    cita: datos.cita,
    nombre: datos.nombre,
    cargo: datos.cargo,
    citaEn: vacioANulo(datos.citaEn),
    cargoEn: vacioANulo(datos.cargoEn),
    visible: datos.visible,
  };
  const actual = await filaDelTestimonio();
  if (actual) await db.update(testimonio).set(valores).where(eq(testimonio.id, actual.id));
  else await db.insert(testimonio).values(valores);

  const guardado = await obtenerTestimonio();
  if (!guardado) throw new Error("testimonio no encontrado tras guardarlo");
  return { ok: true, data: guardado };
}
