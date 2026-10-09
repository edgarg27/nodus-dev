import { NextResponse } from "next/server";
import { z } from "zod";
import {
  MAXIMO_NOTA,
  MAXIMO_PROXIMA_ACCION,
  PASOS_SOLICITUD,
} from "../../../../../../lib/clientes.ts";
import { getUsuarioActual } from "../../../../../../server/auth/session.ts";
import { actualizarSolicitud } from "../../../../../../server/clientes/mutations.ts";
import {
  errorValidacion,
  esUuid,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../../server/http/envelope.ts";
import { manejarError } from "../../../../../../server/http/handle-error.ts";

const solicitudSchema = z.object({
  paso: z.enum(PASOS_SOLICITUD),
  // Las dos juntas o ninguna (null borra la próxima acción).
  proxima_accion: z
    .object({
      texto: z.string().trim().min(1).max(MAXIMO_PROXIMA_ACCION),
      en: z.iso.datetime({ offset: true }),
    })
    .nullable(),
  comentario: z
    .string()
    .trim()
    .max(MAXIMO_NOTA)
    .optional()
    .transform((valor) => (valor ? valor : undefined)),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Actualiza el seguimiento de Captive a una solicitud: paso, próxima acción y comentario opcional.
// Repetir los mismos datos sin comentario deja el mismo resultado.
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const actor = await getUsuarioActual();
    if (!actor) return sinSesion();
    if (actor.rol !== "admin" || !esUuid(id)) return noEncontrado();

    const parsed = solicitudSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorValidacion(parsed.error);

    const { paso, proxima_accion, comentario } = parsed.data;
    const resultado = await actualizarSolicitud(actor, id, {
      paso,
      proximaAccion: proxima_accion
        ? { texto: proxima_accion.texto, en: new Date(proxima_accion.en) }
        : null,
      comentario,
    });
    if (!resultado.ok) {
      return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
    }
    return NextResponse.json({ data: resultado.data });
  } catch (err) {
    return manejarError(err, request);
  }
}
