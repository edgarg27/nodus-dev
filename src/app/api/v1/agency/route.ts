import { NextResponse } from "next/server";
import { z } from "zod";
import { guardarPerfilAgencia } from "../../../../server/agency/mutations.ts";
import {
  listarContactosDeAgencia,
  obtenerPerfilAgencia,
} from "../../../../server/agency/queries.ts";
import { requireRol } from "../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import { errorValidacion, respuestaError, sinSesion } from "../../../../server/http/envelope.ts";

const perfilSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  descripcion: z.string().trim().max(1000).default(""),
  logo_url: z.url().max(500).nullable().optional(),
});

// Perfil de la agencia y sus contactos (con el número de propiedades que usa cada uno).
export async function GET() {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();
  if (!requireRol(actor, "oferente").ok) {
    return respuestaError(403, "forbidden", "Se requiere el rol oferente");
  }
  const [perfil, contactos] = await Promise.all([
    obtenerPerfilAgencia(actor.id),
    listarContactosDeAgencia(actor.id),
  ]);
  return NextResponse.json({ data: { perfil, contactos } });
}

// Idempotente: el perfil es único por oferente, repetir el mismo cuerpo deja el mismo resultado.
export async function PUT(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();

  const parsed = perfilSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorValidacion(parsed.error);

  const resultado = await guardarPerfilAgencia(actor, {
    nombre: parsed.data.nombre,
    descripcion: parsed.data.descripcion,
    logoUrl: parsed.data.logo_url,
  });
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data });
}
