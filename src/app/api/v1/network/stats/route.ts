import { NextResponse } from "next/server";
import { usaLaRed } from "../../../../../lib/red-acceso.ts";
import { requireRol } from "../../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { respuestaError, sinSesion } from "../../../../../server/http/envelope.ts";
import { estadisticasDeLaRed } from "../../../../../server/network/queries.ts";

// Números del banner de la Red. Solo lectura, solo propietarios.
export async function GET() {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  if (!requireRol(actor, "propietario").ok) {
    return respuestaError(403, "forbidden", "Se requiere el rol propietario");
  }
  if (!usaLaRed(actor)) {
    return respuestaError(403, "forbidden", "La Red inmobiliaria es para brokers e inmobiliarias");
  }
  return NextResponse.json({ data: await estadisticasDeLaRed() });
}
