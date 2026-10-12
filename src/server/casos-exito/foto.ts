import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../lib/db/client.ts";
import { casoExito } from "../../lib/db/schema.ts";
import type { ActorAutenticado } from "../auth/session.ts";
import { crearClienteAdmin } from "../supabase/admin.ts";
import { type ErrorCaso, esAdmin, NO_ENCONTRADO, type ResultadoCaso } from "./acceso.ts";
import { obtenerCaso } from "./queries.ts";

// Foto de cada caso de éxito: va al mismo bucket público de las fotos, bajo `casos-exito/<caso>/`,
// y su URL en `caso_exito.foto_url`.

const BUCKET = "propiedades-fotos";
const CARPETA = "casos-exito";
const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// El mismo tope que las demás fotos (y el del bucket).
const TAMANO_MAXIMO = 4_000_000;

export type ErrorFotoCaso = { code: "validation_error"; status: 422; message: string };
export type ResultadoFotoCaso =
  | { ok: true; data: { fotoUrl: string | null } }
  | { ok: false; error: ErrorFotoCaso | ErrorCaso };

// Ruta dentro del bucket a partir de la URL pública, solo si es una foto de un caso.
function rutaDeLaFoto(fotoUrl: string | null): string | null {
  if (!fotoUrl) return null;
  const marcador = `/${BUCKET}/${CARPETA}/`;
  const inicio = fotoUrl.indexOf(marcador);
  return inicio === -1 ? null : fotoUrl.slice(inicio + `/${BUCKET}/`.length);
}

// Si el archivo no se puede borrar, solo queda huérfano en el bucket: no se propaga el error.
export async function borrarFotoDeCaso(fotoUrl: string | null): Promise<void> {
  const ruta = rutaDeLaFoto(fotoUrl);
  if (ruta) await crearClienteAdmin().storage.from(BUCKET).remove([ruta]);
}

export async function subirFotoDeCaso(
  actor: ActorAutenticado | null,
  id: string,
  archivo: { buffer: Buffer; contentType: string },
): Promise<ResultadoFotoCaso> {
  if (!esAdmin(actor)) return NO_ENCONTRADO;
  const caso = await obtenerCaso(id);
  if (!caso) return NO_ENCONTRADO;

  const extension = TIPOS_PERMITIDOS[archivo.contentType];
  if (!extension) {
    return {
      ok: false,
      error: { code: "validation_error", status: 422, message: "Tipo de archivo no permitido" },
    };
  }
  if (archivo.buffer.byteLength > TAMANO_MAXIMO) {
    return {
      ok: false,
      error: { code: "validation_error", status: 422, message: "El archivo supera 4 MB" },
    };
  }

  const admin = crearClienteAdmin();
  const ruta = `${CARPETA}/${id}/${randomUUID()}.${extension}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(ruta, archivo.buffer, { contentType: archivo.contentType });
  if (error) {
    return { ok: false, error: { code: "validation_error", status: 422, message: error.message } };
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(ruta);

  await db.update(casoExito).set({ fotoUrl: data.publicUrl }).where(eq(casoExito.id, id));
  await borrarFotoDeCaso(caso.fotoUrl);
  return { ok: true, data: { fotoUrl: data.publicUrl } };
}

// Idempotente: un caso sin foto queda igual.
export async function quitarFotoDeCaso(
  actor: ActorAutenticado | null,
  id: string,
): Promise<ResultadoCaso<{ fotoUrl: null }>> {
  if (!esAdmin(actor)) return NO_ENCONTRADO;
  const caso = await obtenerCaso(id);
  if (!caso) return NO_ENCONTRADO;

  await db.update(casoExito).set({ fotoUrl: null }).where(eq(casoExito.id, id));
  await borrarFotoDeCaso(caso.fotoUrl);
  return { ok: true, data: { fotoUrl: null } };
}
