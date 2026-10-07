import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { agenciaContacto, propiedad } from "../../lib/db/schema.ts";
import { normalizeAddress } from "../../lib/normalize-address.ts";
import {
  CAMPOS_DETALLE,
  CAMPOS_INDUSTRIALES,
  type DetallesPropiedadInput,
} from "../../lib/property-details.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { buscarDuplicadoActivo } from "./duplicate-check.ts";

export interface CrearPropiedadInput extends DetallesPropiedadInput {
  tipo: string;
  modalidad: string;
  direccion: string;
  lat: number | string;
  lng: number | string;
  estado: string;
  ciudad: string;
  descripcion: string;
  aceptaFinanciamiento?: boolean;
  // Identificación y Red inmobiliaria (panel del oferente). Nulo borra el valor.
  referencia?: string | null;
  titulo?: string | null;
  contactoId?: string | null;
  compartidaEnRed?: boolean;
  comisionPct?: number | null;
  exclusiva?: boolean;
}

export type EditarPropiedadInput = Partial<CrearPropiedadInput>;

export type PropiedadFila = typeof propiedad.$inferSelect;

// Solo los datos del espacio que vienen en el input; los industriales se limpian si el espacio no
// es una nave (un cambio de tipo no deja altura libre ni andenes colgando).
function detallesParaGuardar(input: DetallesPropiedadInput, tipoFinal: string) {
  const valores: Partial<Record<(typeof CAMPOS_DETALLE)[number], unknown>> = {};
  for (const campo of CAMPOS_DETALLE) {
    if (input[campo] !== undefined) valores[campo] = input[campo];
  }
  if (tipoFinal !== "nave_industrial") {
    for (const campo of CAMPOS_INDUSTRIALES) valores[campo] = null;
  }
  return valores as Partial<Pick<PropiedadFila, (typeof CAMPOS_DETALLE)[number]>>;
}

// Campos propios del oferente que no pasan por la revisión del admin (salvo `titulo`, que es texto
// público y sí la reinicia).
const CAMPOS_PROPIOS = [
  "referencia",
  "titulo",
  "contactoId",
  "compartidaEnRed",
  "comisionPct",
  "exclusiva",
] as const;

function camposPropiosParaGuardar(input: Partial<CrearPropiedadInput>) {
  const valores: Partial<Pick<PropiedadFila, (typeof CAMPOS_PROPIOS)[number]>> = {};
  for (const campo of CAMPOS_PROPIOS) {
    if (input[campo] !== undefined) Object.assign(valores, { [campo]: input[campo] });
  }
  return valores;
}

// El contacto elegido tiene que ser del propio oferente: un id ajeno se rechaza.
async function contactoEsDelOferente(oferenteId: string, contactoId: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: agenciaContacto.id })
    .from(agenciaContacto)
    .where(and(eq(agenciaContacto.id, contactoId), eq(agenciaContacto.usuarioId, oferenteId)));
  return fila !== undefined;
}

export type ErrorPropiedad =
  | { code: "forbidden"; status: 403; message: string }
  | { code: "validation_error"; status: 422; message: string }
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

function errorContactoInvalido(): ResultadoPropiedad {
  return {
    ok: false,
    error: { code: "validation_error", status: 422, message: "El contacto elegido no es tuyo" },
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

  if (input.contactoId && !(await contactoEsDelOferente(actor.id, input.contactoId))) {
    return errorContactoInvalido();
  }

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
        aceptaFinanciamiento: input.aceptaFinanciamiento ?? false,
        ...camposPropiosParaGuardar(input),
        ...detallesParaGuardar(input, input.tipo),
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

  if (parche.contactoId && !(await contactoEsDelOferente(actor.id, parche.contactoId))) {
    return errorContactoInvalido();
  }

  const cambiaUbicacion =
    (parche.direccion !== undefined && parche.direccion !== existente.direccion) ||
    (parche.lat !== undefined && String(parche.lat) !== existente.lat) ||
    (parche.lng !== undefined && String(parche.lng) !== existente.lng);

  const cambiaContenido =
    cambiaUbicacion ||
    (parche.tipo !== undefined && parche.tipo !== existente.tipo) ||
    (parche.modalidad !== undefined && parche.modalidad !== existente.modalidad) ||
    (parche.estado !== undefined && parche.estado !== existente.estado) ||
    (parche.ciudad !== undefined && parche.ciudad !== existente.ciudad) ||
    (parche.descripcion !== undefined && parche.descripcion !== existente.descripcion) ||
    (parche.titulo !== undefined && parche.titulo !== existente.titulo);

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
        ...(parche.aceptaFinanciamiento !== undefined
          ? { aceptaFinanciamiento: parche.aceptaFinanciamiento }
          : {}),
        // Referencia, contacto y datos de la Red no alteran qué espacio es: no reinician la revisión.
        ...camposPropiosParaGuardar(parche),
        // Precio y medidas no devuelven la propiedad a revisión: cambian seguido (una baja de
        // renta, por ejemplo) y no alteran qué espacio es ni dónde está.
        ...detallesParaGuardar(parche, parche.tipo ?? existente.tipo),
        // Editar el contenido de una `publicada`/`rechazada` la devuelve a `pendiente` y limpia
        // la revisión, en la misma sentencia UPDATE (§14). Sin cambios de contenido, no toca el
        // ciclo de publicación.
        ...(cambiaContenido
          ? {
              estadoPublicacion: "pendiente",
              motivoRechazo: null,
              revisadaPor: null,
              revisadaEn: null,
            }
          : {}),
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
