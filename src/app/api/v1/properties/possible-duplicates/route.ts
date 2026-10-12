import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { errorValidacion, respuestaError, sinSesion } from "../../../../../server/http/envelope.ts";
import { manejarError } from "../../../../../server/http/handle-error.ts";
import {
  buscarPropiedadesCercanas,
  paraOferente,
} from "../../../../../server/properties/near-duplicates.ts";

const consultaSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  tipo: z.enum(["nave_industrial", "oficina", "local_comercial"]),
  excluir: z.uuid().optional(),
});

// Propiedades vigentes del mismo tipo a pocos metros del punto: el formulario las muestra antes de
// enviar ("¿es alguna de estas?"). Solo lectura, y solo para oferentes. De una propiedad ajena que
// aún no es pública solo se devuelve la dirección.
export async function GET(request: Request) {
  try {
    const actor = await getUsuarioActual();
    if (!actor) return sinSesion();

    const parsed = consultaSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    if (!parsed.success) return errorValidacion(parsed.error);
    if (actor.rol !== "oferente") {
      return respuestaError(403, "forbidden", "Se requiere el rol oferente");
    }

    const { lat, lng, tipo, excluir } = parsed.data;
    const cercanas = await buscarPropiedadesCercanas({ lat, lng, tipo, excluirId: excluir });
    return NextResponse.json({ data: paraOferente(cercanas, actor.id) });
  } catch (err) {
    return manejarError(err, request);
  }
}
