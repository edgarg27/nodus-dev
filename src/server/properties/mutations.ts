import { eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { propiedad } from "../../lib/db/schema.ts";
import { normalizeAddress } from "../../lib/normalize-address.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { buscarDuplicadoActivo } from "./duplicate-check.ts";

export interface CrearPropiedadInput {
  tipo: string;
  modalidad: string;
  direccion: string;
  lat: number | string;
  lng: number | string;
  estado: string;
  ciudad: string;
  descripcion: string;
}

export type EditarPropiedadInput = Partial<CrearPropiedadInput>;

export type PropiedadFila = typeof propiedad.$inferSelect;

export type ErrorPropiedad =
  | { code: "forbidden"; status: 403; message: string }
  | { code: "not_found"; status: 404; message: string }
  | {
      code: "conflict_duplicate_property";
      status: 409;
      message: string;
      details: [{ existing_property_id: string }];
    };

export type ResultadoPropiedad =
  | { ok: true; data: PropiedadFila }
  | { ok: false; error: ErrorPropiedad };

function errorForbidden(): ResultadoPropiedad {
  return {
    ok: false,
    error: { code: "forbidden", status: 403, message: "Se requiere el rol oferente" },
  };
}

function errorNotFound(): ResultadoPropiedad {
  return {
    ok: false,
    error: { code: "not_found", status: 404, message: "Propiedad no encontrada" },
  };
}

function errorDuplicado(existingPropertyId: string): ResultadoPropiedad {
  return {
    ok: false,
    error: {
      code: "conflict_duplicate_property",
      status: 409,
      message: "Ya existe una propiedad activa en esta dirección",
      details: [{ existing_property_id: existingPropertyId }],
    },
  };
}

function esErrorDuplicado(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("cause" in err)) return false;
  const cause = (err as { cause?: unknown }).cause;
  return (
    typeof cause === "object" && cause !== null && (cause as { code?: string }).code === "23505"
  );
}

export async function crearPropiedad(
  actor: ActorAutenticado | null,
  input: CrearPropiedadInput,
): Promise<ResultadoPropiedad> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return errorForbidden();

  const direccionNormalizada = normalizeAddress(input.direccion);
  const duplicado = await buscarDuplicadoActivo(direccionNormalizada, input.lat, input.lng);
  if (duplicado) return errorDuplicado(duplicado.id);

  try {
    const [fila] = await db
      .insert(propiedad)
      .values({
        oferenteId: actor.id,
        tipo: input.tipo,
        modalidad: input.modalidad,
        direccion: input.direccion,
        direccionNormalizada,
        lat: String(input.lat),
        lng: String(input.lng),
        estado: input.estado,
        ciudad: input.ciudad,
        descripcion: input.descripcion,
      })
      .returning();
    if (!fila) throw new Error("insert de propiedad no devolvió fila");
    return { ok: true, data: fila };
  } catch (err) {
    if (!esErrorDuplicado(err)) throw err;
    const duplicadoCarrera = await buscarDuplicadoActivo(
      direccionNormalizada,
      input.lat,
      input.lng,
    );
    return errorDuplicado(duplicadoCarrera?.id ?? "");
  }
}

export async function editarPropiedad(
  actor: ActorAutenticado | null,
  id: string,
  parche: EditarPropiedadInput,
): Promise<ResultadoPropiedad> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return errorForbidden();

  const [existente] = await db.select().from(propiedad).where(eq(propiedad.id, id));
  if (!existente || existente.oferenteId !== actor.id) return errorNotFound();

  const cambiaUbicacion =
    (parche.direccion !== undefined && parche.direccion !== existente.direccion) ||
    (parche.lat !== undefined && String(parche.lat) !== existente.lat) ||
    (parche.lng !== undefined && String(parche.lng) !== existente.lng);

  const direccionNormalizada =
    parche.direccion !== undefined
      ? normalizeAddress(parche.direccion)
      : existente.direccionNormalizada;
  const lat = parche.lat ?? existente.lat;
  const lng = parche.lng ?? existente.lng;

  if (cambiaUbicacion) {
    const duplicado = await buscarDuplicadoActivo(direccionNormalizada, lat, lng, {
      excluirId: id,
    });
    if (duplicado) return errorDuplicado(duplicado.id);
  }

  try {
    const [fila] = await db
      .update(propiedad)
      .set({
        ...(parche.tipo !== undefined ? { tipo: parche.tipo } : {}),
        ...(parche.modalidad !== undefined ? { modalidad: parche.modalidad } : {}),
        ...(parche.direccion !== undefined
          ? { direccion: parche.direccion, direccionNormalizada }
          : {}),
        ...(parche.lat !== undefined ? { lat: String(parche.lat) } : {}),
        ...(parche.lng !== undefined ? { lng: String(parche.lng) } : {}),
        ...(parche.estado !== undefined ? { estado: parche.estado } : {}),
        ...(parche.ciudad !== undefined ? { ciudad: parche.ciudad } : {}),
        ...(parche.descripcion !== undefined ? { descripcion: parche.descripcion } : {}),
      })
      .where(eq(propiedad.id, id))
      .returning();
    if (!fila) throw new Error("update de propiedad no devolvió fila");
    return { ok: true, data: fila };
  } catch (err) {
    if (!esErrorDuplicado(err)) throw err;
    const duplicadoCarrera = await buscarDuplicadoActivo(direccionNormalizada, lat, lng, {
      excluirId: id,
    });
    return errorDuplicado(duplicadoCarrera?.id ?? "");
  }
}

export async function darDeBajaPropiedad(
  actor: ActorAutenticado | null,
  id: string,
): Promise<ResultadoPropiedad> {
  const permiso = requireRol(actor, "oferente");
  if (!permiso.ok || !actor) return errorForbidden();

  const [existente] = await db.select().from(propiedad).where(eq(propiedad.id, id));
  if (!existente || existente.oferenteId !== actor.id) return errorNotFound();

  const [fila] = await db
    .update(propiedad)
    .set({ activo: false })
    .where(eq(propiedad.id, id))
    .returning();
  if (!fila) throw new Error("update de baja no devolvió fila");
  return { ok: true, data: fila };
}
