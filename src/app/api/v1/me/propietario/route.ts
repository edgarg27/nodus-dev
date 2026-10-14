import { NextResponse } from "next/server";
import { z } from "zod";
import { datosPropietarioSchema } from "../../../../../lib/auth/datos-propietario.ts";
import { convertirEnPropietario } from "../../../../../server/auth/convertir-propietario.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { errorValidacion, respuestaError, sinSesion } from "../../../../../server/http/envelope.ts";

const cuerpoSchema = z.object({
  telefono: z.string(),
  tipo_anunciante: z.string(),
  empresa: z.string().optional(),
});

// El buscador actual pasa a propietario ("Publica tu espacio"). Idempotente en el resultado: repetirlo
// como propietario responde 403 sin cambiar nada.
export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();

  const cuerpo = cuerpoSchema.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) return errorValidacion(cuerpo.error);
  const datos = datosPropietarioSchema.safeParse({
    telefono: cuerpo.data.telefono,
    tipoAnunciante: cuerpo.data.tipo_anunciante,
    empresa: cuerpo.data.empresa?.trim() || undefined,
  });
  if (!datos.success) return errorValidacion(datos.error);

  const resultado = await convertirEnPropietario(actor, datos.data);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: { rol: "propietario" } });
}
