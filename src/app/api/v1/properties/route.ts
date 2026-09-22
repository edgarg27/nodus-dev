import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../server/auth/session.ts";
import { crearPropiedad } from "../../../../server/properties/mutations.ts";

const TIPOS = ["nave_industrial", "oficina", "local_comercial"] as const;
const MODALIDADES = ["renta", "venta", "desde_cero"] as const;
const ESTADOS = ["SLP", "Aguascalientes", "Leon"] as const;

// Rango geográfico de México continental (bounding box estándar, decisión del builder — el
// blueprint exige el rango sin dar los números exactos).
const LAT_MIN = 14.5;
const LAT_MAX = 32.7;
const LNG_MIN = -118.4;
const LNG_MAX = -86.7;

const crearPropiedadSchema = z.object({
  tipo: z.enum(TIPOS),
  modalidad: z.enum(MODALIDADES),
  direccion: z.string().trim().min(1),
  lat: z.number().min(LAT_MIN).max(LAT_MAX),
  lng: z.number().min(LNG_MIN).max(LNG_MAX),
  estado: z.enum(ESTADOS),
  ciudad: z.string().trim().min(1),
  descripcion: z.string().trim().min(1),
});

function requestId(): string {
  return `req_${randomUUID()}`;
}

function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: { code, message, ...(details ? { details } : {}), request_id: requestId() },
  };
}

export async function POST(request: Request) {
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = crearPropiedadSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos", details), {
      status: 422,
    });
  }

  const resultado = await crearPropiedad(actor, parsed.data);
  if (!resultado.ok) {
    if (resultado.error.code === "forbidden") {
      return NextResponse.json(errorEnvelope("forbidden", resultado.error.message), {
        status: 403,
      });
    }
    if (resultado.error.code === "conflict_duplicate_property") {
      const [detalle] = resultado.error.details;
      return NextResponse.json(
        errorEnvelope("conflict_duplicate_property", resultado.error.message, [
          {
            field: "direccion",
            message: "duplicado",
            existing_property_id: detalle.existing_property_id,
          },
        ]),
        { status: 409 },
      );
    }
    return NextResponse.json(errorEnvelope("internal_error", "Error inesperado"), {
      status: 500,
    });
  }

  return NextResponse.json({ data: resultado.data }, { status: 201 });
}
