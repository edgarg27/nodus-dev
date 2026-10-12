import { NextResponse } from "next/server";
import { casoCreacionSchema } from "../../../../../lib/casos-exito.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { esAdmin } from "../../../../../server/casos-exito/acceso.ts";
import { crearCaso } from "../../../../../server/casos-exito/mutations.ts";
import { listarTodosLosCasos } from "../../../../../server/casos-exito/queries.ts";
import {
  errorValidacion,
  noEncontrado,
  respuestaError,
  sinSesion,
} from "../../../../../server/http/envelope.ts";

// Casos de éxito de la portada. Solo admin: 401 sin sesión y 404 para cualquier otro rol.
export async function GET() {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  if (!esAdmin(actor)) return noEncontrado();
  return NextResponse.json({ data: await listarTodosLosCasos() });
}

// No es idempotente: cada llamada crea un caso nuevo (toma el primer lugar libre de la portada si no
// trae `posicion`; un lugar ya ocupado responde 409).
export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();

  const parsed = casoCreacionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorValidacion(parsed.error);

  const resultado = await crearCaso(actor, parsed.data);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data }, { status: 201 });
}
