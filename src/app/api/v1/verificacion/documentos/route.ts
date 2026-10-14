import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { TIPOS_DOCUMENTO } from "../../../../../lib/verificacion.ts";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { subirDocumento } from "../../../../../server/verificacion/documentos.ts";

const tipoSchema = z.enum(TIPOS_DOCUMENTO);

function errorEnvelope(code: string, message: string) {
  return { error: { code, message, request_id: `req_${randomUUID()}` } };
}

// Sube (o reemplaza) un documento de verificación del propietario con sesión. No es idempotente a
// propósito: cada envío guarda el archivo nuevo y descarta el anterior del mismo tipo.
export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const formData = await request.formData().catch(() => null);
  const tipo = tipoSchema.safeParse(formData?.get("tipo"));
  const archivo = formData?.get("archivo");
  if (!tipo.success) {
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos"), {
      status: 422,
    });
  }
  if (!(archivo instanceof File)) {
    return NextResponse.json(errorEnvelope("validation_error", "Falta el archivo"), {
      status: 422,
    });
  }

  const resultado = await subirDocumento(actor, tipo.data, {
    buffer: Buffer.from(await archivo.arrayBuffer()),
    contentType: archivo.type,
    nombre: archivo.name,
  });
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.json(
    {
      data: {
        id: resultado.data.id,
        tipo: resultado.data.tipo,
        nombre_archivo: resultado.data.nombreArchivo,
        created_at: resultado.data.createdAt,
      },
    },
    { status: 201 },
  );
}
