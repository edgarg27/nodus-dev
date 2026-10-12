import { eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { brokerSolicitud } from "../../lib/db/schema.ts";
import { documentosFaltantes } from "../../lib/verificacion.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { aprobarSolicitud, type ResultadoAprobacion } from "../broker-requests/resolve.ts";
import { listarDocumentosDe } from "./documentos.ts";

const NOTA_MAXIMO = 500;

export type ResultadoAprobacionRevisada =
  | ResultadoAprobacion
  | { ok: false; error: { code: "documents_missing"; status: 422; message: string } };

// Lo que usa el panel: aprobar exige que la persona haya subido todos sus documentos. Si faltan,
// Captive solo puede aprobar dejando escrito por qué (queda en `nota_aprobacion`). El candado y la
// transacción siguen siendo los de `aprobarSolicitud`.
export async function aprobarSolicitudRevisada(
  actor: ActorAutenticado | null,
  id: string,
  nota?: string,
): Promise<ResultadoAprobacionRevisada> {
  const notaRecortada = nota?.trim().slice(0, NOTA_MAXIMO) ?? "";

  const permiso = requireRol(actor, "admin");
  if (permiso.ok) {
    const [solicitud] = await db.select().from(brokerSolicitud).where(eq(brokerSolicitud.id, id));
    if (solicitud?.estado === "pendiente" && !notaRecortada) {
      const documentos = await listarDocumentosDe(solicitud.usuarioId);
      if (documentosFaltantes(solicitud.tipo, documentos).length > 0) {
        return {
          ok: false,
          error: {
            code: "documents_missing",
            status: 422,
            message: "Faltan documentos: escribe por qué apruebas sin ellos",
          },
        };
      }
    }
  }

  const resultado = await aprobarSolicitud(actor, id);
  if (resultado.ok && notaRecortada) {
    await db
      .update(brokerSolicitud)
      .set({ notaAprobacion: notaRecortada })
      .where(eq(brokerSolicitud.id, id));
  }
  return resultado;
}
