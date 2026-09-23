import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUsuarioActual } from "../../../../../server/auth/session.ts";
import { darDeBajaPropiedad, editarPropiedad } from "../../../../../server/properties/mutations.ts";
import {
  obtenerPropiedadDelDuenoPorId,
  obtenerPropiedadPublicaPorId,
} from "../../../../../server/properties/queries.ts";

const TIPOS = ["nave_industrial", "oficina", "local_comercial"] as const;
const MODALIDADES = ["renta", "venta", "desde_cero"] as const;
const ESTADOS = ["SLP", "Aguascalientes", "Leon"] as const;

const LAT_MIN = 14.5;
const LAT_MAX = 32.7;
const LNG_MIN = -118.4;
const LNG_MAX = -86.7;

const editarPropiedadSchema = z.object({
  tipo: z.enum(TIPOS).optional(),
  modalidad: z.enum(MODALIDADES).optional(),
  direccion: z.string().trim().min(1).optional(),
  lat: z.number().min(LAT_MIN).max(LAT_MAX).optional(),
  lng: z.number().min(LNG_MIN).max(LNG_MAX).optional(),
  estado: z.enum(ESTADOS).optional(),
  ciudad: z.string().trim().min(1).optional(),
  descripcion: z.string().trim().min(1).optional(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esUuid(valor: string): boolean {
  return UUID_REGEX.test(valor);
}

function requestId(): string {
  return `req_${randomUUID()}`;
}

function errorEnvelope(code: string, message: string, details?: unknown[]) {
  return {
    error: { code, message, ...(details ? { details } : {}), request_id: requestId() },
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!esUuid(id)) {
    return NextResponse.json(errorEnvelope("not_found", "Propiedad no encontrada"), {
      status: 404,
    });
  }

  const publica = await obtenerPropiedadPublicaPorId(id);
  if (publica) {
    return NextResponse.json({ data: publica });
  }

  const actor = await getUsuarioActual();
  if (actor) {
    const propia = await obtenerPropiedadDelDuenoPorId(actor.id, id);
    if (propia) {
      return NextResponse.json({ data: propia });
    }
  }

  return NextResponse.json(errorEnvelope("not_found", "Propiedad no encontrada"), {
    status: 404,
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  if (!esUuid(id)) {
    return NextResponse.json(errorEnvelope("not_found", "Propiedad no encontrada"), {
      status: 404,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = editarPropiedadSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(errorEnvelope("validation_error", "Datos inválidos", details), {
      status: 422,
    });
  }

  const resultado = await editarPropiedad(actor, id, parsed.data);
  if (!resultado.ok) {
    if (resultado.error.code === "forbidden") {
      return NextResponse.json(errorEnvelope("forbidden", resultado.error.message), {
        status: 403,
      });
    }
    if (resultado.error.code === "not_found") {
      return NextResponse.json(errorEnvelope("not_found", resultado.error.message), {
        status: 404,
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

  return NextResponse.json({ data: resultado.data }, { status: 200 });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  if (!esUuid(id)) {
    return NextResponse.json(errorEnvelope("not_found", "Propiedad no encontrada"), {
      status: 404,
    });
  }

  const resultado = await darDeBajaPropiedad(actor, id);
  if (!resultado.ok) {
    if (resultado.error.code === "forbidden") {
      return NextResponse.json(errorEnvelope("forbidden", resultado.error.message), {
        status: 403,
      });
    }
    if (resultado.error.code === "not_found") {
      return NextResponse.json(errorEnvelope("not_found", resultado.error.message), {
        status: 404,
      });
    }
    return NextResponse.json(errorEnvelope("internal_error", "Error inesperado"), {
      status: 500,
    });
  }

  return NextResponse.json({ data: resultado.data }, { status: 200 });
}
