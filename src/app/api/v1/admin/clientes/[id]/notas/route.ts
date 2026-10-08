import { NextResponse } from "next/server";
import { z } from "zod";
import { MAXIMO_NOTA, TIPOS_NOTA } from "../../../../../../../lib/clientes.ts";
import { getUsuarioActual } from "../../../../../../../server/auth/session.ts";
import { agregarNotaCliente } from "../../../../../../../server/clientes/mutations.ts";
import {
  errorValidacion,
  esUuid,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../../../server/http/envelope.ts";
import { manejarError } from "../../../../../../../server/http/handle-error.ts";

const notaSchema = z.object({
  tipo: z.enum(TIPOS_NOTA),
  texto: z.string().trim().min(1).max(MAXIMO_NOTA),
  contact_request_id: z.uuid().nullish(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Agrega una nota a la bitácora de seguimiento del cliente. No es idempotente: cada envío es una
// nota nueva (una llamada distinta).
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const actor = await getUsuarioActual();
    if (!actor) return sinSesion();
    if (actor.rol !== "admin" || !esUuid(id)) return noEncontrado();

    const parsed = notaSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorValidacion(parsed.error);

    const resultado = await agregarNotaCliente(actor, id, {
      tipo: parsed.data.tipo,
      texto: parsed.data.texto,
      contactRequestId: parsed.data.contact_request_id ?? null,
    });
    if (!resultado.ok) {
      return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
    }
    return NextResponse.json({ data: resultado.data }, { status: 201 });
  } catch (err) {
    return manejarError(err, request);
  }
}
