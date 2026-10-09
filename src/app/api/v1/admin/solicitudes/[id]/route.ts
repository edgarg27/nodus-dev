import { NextResponse } from "next/server";
import { z } from "zod";
import {
  MAXIMO_NOTA,
  MAXIMO_RECORDATORIO,
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

// Todo es opcional: avanzar o descartar manda solo `paso`; "¿Qué pasó?" manda `comentario` y
// `recordatorio` (null lo quita).
const solicitudSchema = z.object({
  paso: z.enum(PASOS_SOLICITUD).optional(),
  recordatorio: z
    .object({
      texto: z.string().trim().min(1).max(MAXIMO_RECORDATORIO),
      en: z.iso.datetime({ offset: true }),
    })
    .nullable()
    .optional(),
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

// Actualiza el seguimiento de Captive a una solicitud: paso, recordatorio y lo que pasó. Repetir los
// mismos datos sin comentario deja el mismo resultado (el comentario es una nota nueva cada vez).
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const actor = await getUsuarioActual();
    if (!actor) return sinSesion();
    if (actor.rol !== "admin" || !esUuid(id)) return noEncontrado();

    const parsed = solicitudSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorValidacion(parsed.error);

    const { paso, recordatorio, comentario } = parsed.data;
    const resultado = await actualizarSolicitud(actor, id, {
      paso,
      recordatorio:
        recordatorio === undefined
          ? undefined
          : recordatorio && { texto: recordatorio.texto, en: new Date(recordatorio.en) },
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
