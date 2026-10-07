import { NextResponse } from "next/server";
import { requireRol } from "../../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { respuestaError, sinSesion } from "../../../../../server/http/envelope.ts";
import { estadisticasDeLaRed } from "../../../../../server/network/queries.ts";

// Números del banner de la Red. Solo lectura, solo oferentes.
export async function GET() {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  if (!requireRol(actor, "oferente").ok) {
    return respuestaError(403, "forbidden", "Se requiere el rol oferente");
  }
  return NextResponse.json({ data: await estadisticasDeLaRed() });
}
