import { NextResponse } from "next/server";
import { z } from "zod";
import { crearContactoDeAgencia } from "../../../../../server/agency/mutations.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { errorValidacion, respuestaError, sinSesion } from "../../../../../server/http/envelope.ts";

const contactoSchema = z
  .object({
    tipo: z.enum(["email", "telefono", "whatsapp"]),
    valor: z.string().trim().min(1).max(200),
  })
  .superRefine((contacto, ctx) => {
    if (contacto.tipo === "email" && !z.email().safeParse(contacto.valor).success) {
      ctx.addIssue({ code: "custom", path: ["valor"], message: "Correo inválido" });
    }
    if (contacto.tipo !== "email" && contacto.valor.replace(/\D/g, "").length < 8) {
      ctx.addIssue({ code: "custom", path: ["valor"], message: "Teléfono inválido" });
    }
  });

// Idempotente: repetir el mismo (tipo, valor) responde con el contacto existente.
export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) return sinSesion();

  const parsed = contactoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorValidacion(parsed.error);

  const resultado = await crearContactoDeAgencia(actor, parsed.data);
  if (!resultado.ok) {
    return respuestaError(resultado.error.status, resultado.error.code, resultado.error.message);
  }
  return NextResponse.json({ data: resultado.data }, { status: 201 });
}
