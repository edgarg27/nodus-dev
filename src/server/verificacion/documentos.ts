import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { verificacionDocumento } from "../../lib/db/schema.ts";
import {
  documentosRequeridos,
  FORMATOS_DOCUMENTO,
  TAMANO_MAXIMO_DOCUMENTO,
  type TipoDocumento,
} from "../../lib/verificacion.ts";
import { requireRol } from "../auth/guards.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { ultimaSolicitudDe } from "../broker-requests/queries.ts";
import { crearClienteAdmin } from "../supabase/admin.ts";

const BUCKET = "verificacion-documentos";
// Lo que dura el enlace con el que se abre un documento.
const SEGUNDOS_URL_FIRMADA = 60;

export interface DocumentoVerificacion {
  id: string;
  usuarioId: string;
  tipo: string;
  nombreArchivo: string;
  createdAt: Date;
}

export interface ArchivoDocumento {
  buffer: Buffer;
  contentType: string;
  nombre: string;
}

export type ErrorDocumento =
  | { code: "forbidden"; status: 403; message: string }
  | { code: "not_found"; status: 404; message: string }
  | { code: "validation_error"; status: 422; message: string }
  | { code: "conflict_already_verified"; status: 409; message: string };

export type ResultadoSubirDocumento =
  | { ok: true; data: DocumentoVerificacion }
  | { ok: false; error: ErrorDocumento };

export type ResultadoUrlDocumento =
  | { ok: true; data: { url: string } }
  | { ok: false; error: ErrorDocumento };

const COLUMNAS = {
  id: verificacionDocumento.id,
  usuarioId: verificacionDocumento.usuarioId,
  tipo: verificacionDocumento.tipo,
  nombreArchivo: verificacionDocumento.nombreArchivo,
  createdAt: verificacionDocumento.createdAt,
};

function errorValidacion(message: string): { ok: false; error: ErrorDocumento } {
  return { ok: false, error: { code: "validation_error", status: 422, message } };
}

function errorNoEncontrado(): { ok: false; error: ErrorDocumento } {
  return {
    ok: false,
    error: { code: "not_found", status: 404, message: "Documento no encontrado" },
  };
}

export async function listarDocumentosDe(usuarioId: string): Promise<DocumentoVerificacion[]> {
  return db
    .select(COLUMNAS)
    .from(verificacionDocumento)
    .where(eq(verificacionDocumento.usuarioId, usuarioId))
    .orderBy(asc(verificacionDocumento.createdAt));
}

// Documentos de varias personas en una sola consulta (cola de solicitudes del admin).
export async function listarDocumentosDeUsuarios(
  usuarioIds: string[],
): Promise<Map<string, DocumentoVerificacion[]>> {
  const porUsuario = new Map<string, DocumentoVerificacion[]>();
  if (usuarioIds.length === 0) return porUsuario;
  const filas = await db
    .select(COLUMNAS)
    .from(verificacionDocumento)
    .where(inArray(verificacionDocumento.usuarioId, usuarioIds))
    .orderBy(asc(verificacionDocumento.createdAt));
  for (const fila of filas) {
    porUsuario.set(fila.usuarioId, [...(porUsuario.get(fila.usuarioId) ?? []), fila]);
  }
  return porUsuario;
}

// Solo el propietario cuya solicitud sigue sin aprobarse, y solo los documentos que le tocan a su tipo
// de solicitud. Subir otro del mismo tipo reemplaza al anterior (fila y archivo).
export async function subirDocumento(
  actor: ActorAutenticado | null,
  tipo: TipoDocumento,
  archivo: ArchivoDocumento,
): Promise<ResultadoSubirDocumento> {
  const permiso = requireRol(actor, "propietario");
  if (!permiso.ok || !actor) {
    return {
      ok: false,
      error: { code: "forbidden", status: 403, message: "Se requiere el rol propietario" },
    };
  }

  const solicitud = await ultimaSolicitudDe(actor.id);
  if (!solicitud || solicitud.estado === "aprobada") {
    return {
      ok: false,
      error: {
        code: "conflict_already_verified",
        status: 409,
        message: "Tu cuenta no tiene una verificación pendiente",
      },
    };
  }
  if (!documentosRequeridos(solicitud.tipo).includes(tipo)) {
    return errorValidacion("Ese documento no corresponde a tu solicitud");
  }

  const extension = FORMATOS_DOCUMENTO[archivo.contentType];
  if (!extension) return errorValidacion("Tipo de archivo no permitido");
  if (archivo.buffer.byteLength === 0) return errorValidacion("Falta el archivo");
  if (archivo.buffer.byteLength > TAMANO_MAXIMO_DOCUMENTO) {
    return errorValidacion("El archivo supera 4 MB");
  }

  const admin = crearClienteAdmin();
  const ruta = `${actor.id}/${tipo}-${randomUUID()}.${extension}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(ruta, archivo.buffer, { contentType: archivo.contentType });
  if (error) return errorValidacion("No se pudo guardar el archivo");

  const [anterior] = await db
    .select({ storagePath: verificacionDocumento.storagePath })
    .from(verificacionDocumento)
    .where(
      and(eq(verificacionDocumento.usuarioId, actor.id), eq(verificacionDocumento.tipo, tipo)),
    );

  const valores = {
    storagePath: ruta,
    nombreArchivo: archivo.nombre.slice(0, 200) || `${tipo}.${extension}`,
    contentType: archivo.contentType,
    createdAt: new Date(),
  };
  const [fila] = await db
    .insert(verificacionDocumento)
    .values({ usuarioId: actor.id, tipo, ...valores })
    .onConflictDoUpdate({
      target: [verificacionDocumento.usuarioId, verificacionDocumento.tipo],
      set: valores,
    })
    .returning(COLUMNAS);
  if (!fila) throw new Error("insert de verificacion_documento no devolvió fila");

  if (anterior) await admin.storage.from(BUCKET).remove([anterior.storagePath]);

  return { ok: true, data: fila };
}

// Enlace temporal para abrir un documento: solo quien lo subió o un admin. A cualquier otro se le
// responde `not_found` (no confirma que exista).
export async function urlDeDocumento(
  actor: ActorAutenticado | null,
  id: string,
): Promise<ResultadoUrlDocumento> {
  if (!actor) return errorNoEncontrado();
  const [documento] = await db
    .select()
    .from(verificacionDocumento)
    .where(eq(verificacionDocumento.id, id));
  if (!documento) return errorNoEncontrado();
  if (actor.rol !== "admin" && documento.usuarioId !== actor.id) return errorNoEncontrado();

  const { data, error } = await crearClienteAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(documento.storagePath, SEGUNDOS_URL_FIRMADA);
  if (error || !data) return errorNoEncontrado();

  return { ok: true, data: { url: data.signedUrl } };
}
