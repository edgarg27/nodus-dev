import { NextResponse } from "next/server";
import { testimonioSchema } from "../../../../../lib/testimonio.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { errorValidacion, respuestaError, sinSesion } from "../../../../../server/http/envelope.ts";
import { guardarTestimonio } from "../../../../../server/testimonio/mutations.ts";

// Testimonio de la portada. Solo admin: 401 sin sesión y 404 para cualquier otro rol. Idempotente:
// guarda el estado completo (hay un solo testimonio).
export async function PUT(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();

  const parsed = testimonioSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorValidacion(parsed.error);

  const resultado = await guardarTestimonio(actor, parsed.data);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data });
}
