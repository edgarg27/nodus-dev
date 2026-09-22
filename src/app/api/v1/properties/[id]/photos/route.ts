import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "../../../../../../lib/db/client.ts";
import { propiedad } from "../../../../../../lib/db/schema.ts";
import { requireRol } from "../../../../../../server/auth/guards.ts";
import { getUsuarioActual } from "../../../../../../server/auth/session.ts";
import {
  agregarFotoPropiedad,
  quitarFotoPropiedad,
} from "../../../../../../server/properties/photos.ts";

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

async function verificarPropiedadDelDueno(id: string, oferenteId: string) {
  if (!esUuid(id)) return null;
  const [prop] = await db.select().from(propiedad).where(eq(propiedad.id, id));
  if (!prop || prop.oferenteId !== oferenteId) return null;
  return prop;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok) {
    return NextResponse.json(errorEnvelope("forbidden", "Se requiere el rol oferente"), {
      status: 403,
    });
  }

  const prop = await verificarPropiedadDelDueno(id, actor.id);
  if (!prop) {
    return NextResponse.json(errorEnvelope("not_found", "Propiedad no encontrada"), {
      status: 404,
    });
  }

  const formData = await request.formData().catch(() => null);
  const archivo = formData?.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json(errorEnvelope("validation_error", "Falta el archivo"), {
      status: 422,
    });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const resultado = await agregarFotoPropiedad(id, { buffer, contentType: archivo.type });
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.json(
    {
      data: {
        id: resultado.data.id,
        storage_url: resultado.data.storageUrl,
        orden: resultado.data.orden,
      },
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const actor = await getUsuarioActual();
  if (!actor) {
    return NextResponse.json(errorEnvelope("unauthenticated", "Sesión requerida"), {
      status: 401,
    });
  }

  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok) {
    return NextResponse.json(errorEnvelope("forbidden", "Se requiere el rol oferente"), {
      status: 403,
    });
  }

  const prop = await verificarPropiedadDelDueno(id, actor.id);
  if (!prop) {
    return NextResponse.json(errorEnvelope("not_found", "Propiedad no encontrada"), {
      status: 404,
    });
  }

  const url = new URL(request.url);
  const fotoId = url.searchParams.get("foto");
  if (!fotoId) {
    return NextResponse.json(errorEnvelope("validation_error", "Falta el parámetro foto"), {
      status: 422,
    });
  }

  const resultado = await quitarFotoPropiedad(fotoId);
  if (!resultado.ok) {
    return NextResponse.json(errorEnvelope(resultado.error.code, resultado.error.message), {
      status: resultado.error.status,
    });
  }

  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
